/**
 * Shared input-validation and safe-egress helpers.
 */

import dns from 'dns/promises';
import net from 'net';
import sharp from 'sharp';

export const MAX_IMAGE_BASE64_CHARS = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_DIMENSION = 10_000;
export const MAX_RESIZE_DIMENSION = 4_000;
export const MIN_GRID_SIZE = 2;
export const MAX_GRID_SIZE = 10;
export const MAX_REMOTE_BYTES = 10 * 1024 * 1024;
export const MAX_REMOTE_REDIRECTS = 3;
export const MAX_ERROR_TEXT_CHARS = 512;

export class ValidationError extends Error {}

/** Truncate untrusted remote text so it cannot flood logs or tool output. */
export function truncateUntrusted(text, maxChars = MAX_ERROR_TEXT_CHARS) {
    const str = typeof text === 'string' ? text : String(text ?? '');
    return str.length > maxChars ? `${str.slice(0, maxChars)}…[truncated]` : str;
}

/**
 * Decode a base64 image payload, rejecting oversized inputs before allocation.
 * Accepts raw base64 or a `data:` URL.
 */
export function decodeImageBase64(imageBase64, label = 'imageBase64') {
    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
        throw new ValidationError(`${label} must be a non-empty base64 string`);
    }
    const payload = imageBase64.startsWith('data:')
        ? imageBase64.slice(imageBase64.indexOf(',') + 1)
        : imageBase64;
    if (payload.length > MAX_IMAGE_BASE64_CHARS) {
        throw new ValidationError(`${label} exceeds the maximum size of ${MAX_IMAGE_BASE64_CHARS} base64 characters`);
    }
    const buffer = Buffer.from(payload, 'base64');
    if (buffer.length === 0) {
        throw new ValidationError(`${label} is not valid base64 image data`);
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new ValidationError(`Decoded image exceeds the maximum size of ${MAX_IMAGE_BYTES} bytes`);
    }
    return buffer;
}

/** Create a sharp pipeline with a hard pixel budget so decode bombs are rejected. */
export function openImage(buffer) {
    return sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' });
}

/** Read metadata and reject images whose declared geometry is out of bounds. */
export async function readImageMetadata(buffer) {
    const metadata = await openImage(buffer).metadata();
    const { width, height } = metadata;
    if (!width || !height) {
        throw new ValidationError('Unable to determine image dimensions');
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        throw new ValidationError(`Image dimensions exceed the ${MAX_IMAGE_DIMENSION}px limit`);
    }
    if (width * height > MAX_IMAGE_PIXELS) {
        throw new ValidationError(`Image exceeds the ${MAX_IMAGE_PIXELS} pixel limit`);
    }
    return metadata;
}

/** Validate a caller-supplied resize request. */
export function validateResizeDimension(value, label) {
    if (value === undefined || value === null) return undefined;
    const dimension = Number(value);
    if (!Number.isInteger(dimension) || dimension < 1 || dimension > MAX_RESIZE_DIMENSION) {
        throw new ValidationError(`${label} must be an integer between 1 and ${MAX_RESIZE_DIMENSION}`);
    }
    return dimension;
}

/** Validate a grid size before it is used to allocate cell structures. */
export function validateGridSize(value) {
    const gridSize = Number(value);
    if (!Number.isInteger(gridSize) || gridSize < MIN_GRID_SIZE || gridSize > MAX_GRID_SIZE) {
        throw new ValidationError(`gridSize must be an integer between ${MIN_GRID_SIZE} and ${MAX_GRID_SIZE}`);
    }
    return gridSize;
}

function isBlockedAddress(address) {
    if (net.isIPv4(address)) {
        const [a, b] = address.split('.').map(Number);
        if (a === 0 || a === 10 || a === 127) return true;
        if (a === 169 && b === 254) return true; // link-local + cloud metadata
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
        if (a === 192 && b === 0) return true;
        if (a >= 224) return true; // multicast + reserved
        return false;
    }
    if (net.isIPv6(address)) {
        const ip = address.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
        if (ip === '::' || ip === '::1') return true;
        if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true;
        if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique-local
        if (ip.startsWith('ff')) return true; // multicast
        const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) return isBlockedAddress(mapped[1]);
        return false;
    }
    return true;
}

/**
 * Validate that a URL points at a public HTTPS endpoint, resolving DNS so that
 * names pointing at private, loopback, link-local or metadata addresses are rejected.
 */
export async function assertSafePublicUrl(rawUrl, { allowedHosts } = {}) {
    let url;
    try {
        url = new URL(String(rawUrl));
    } catch {
        throw new ValidationError('Invalid URL');
    }
    if (url.protocol !== 'https:') {
        throw new ValidationError('Only https URLs are allowed');
    }
    if (url.username || url.password) {
        throw new ValidationError('URLs with embedded credentials are not allowed');
    }
    const hostname = url.hostname.toLowerCase();
    if (allowedHosts && !allowedHosts.includes(hostname)) {
        throw new ValidationError(`Host ${hostname} is not in the allowlist`);
    }
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
        throw new ValidationError(`Host ${hostname} resolves to a non-public address`);
    }

    const literal = hostname.replace(/^\[|\]$/g, '');
    if (net.isIP(literal)) {
        if (isBlockedAddress(literal)) {
            throw new ValidationError(`Host ${hostname} resolves to a non-public address`);
        }
        return url;
    }

    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) {
        throw new ValidationError(`Host ${hostname} could not be resolved`);
    }
    for (const record of records) {
        if (isBlockedAddress(record.address)) {
            throw new ValidationError(`Host ${hostname} resolves to a non-public address`);
        }
    }
    return url;
}

/**
 * Fetch an untrusted, caller-supplied resource safely: HTTPS only, SSRF-validated
 * at every hop, bounded by a timeout and a maximum response size.
 */
export async function fetchExternalResource(rawUrl, options = {}) {
    const { timeoutMs = 15000, maxBytes = MAX_REMOTE_BYTES, allowedHosts } = options;
    let target = await assertSafePublicUrl(rawUrl, { allowedHosts });

    for (let hop = 0; hop <= MAX_REMOTE_REDIRECTS; hop++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let response;
        try {
            response = await fetch(target, { redirect: 'manual', signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
                throw new ValidationError(`Redirect without a location header from ${target.hostname}`);
            }
            target = await assertSafePublicUrl(new URL(location, target).toString(), { allowedHosts });
            continue;
        }

        if (!response.ok) {
            throw new ValidationError(`Failed to fetch resource: HTTP ${response.status}`);
        }

        const declared = Number(response.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > maxBytes) {
            throw new ValidationError(`Resource exceeds the maximum size of ${maxBytes} bytes`);
        }
        return await readBounded(response, maxBytes);
    }

    throw new ValidationError('Too many redirects while fetching resource');
}

async function readBounded(response, maxBytes) {
    if (!response.body) {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > maxBytes) {
            throw new ValidationError(`Resource exceeds the maximum size of ${maxBytes} bytes`);
        }
        return buffer;
    }
    const chunks = [];
    let total = 0;
    for await (const chunk of response.body) {
        total += chunk.length;
        if (total > maxBytes) {
            throw new ValidationError(`Resource exceeds the maximum size of ${maxBytes} bytes`);
        }
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
