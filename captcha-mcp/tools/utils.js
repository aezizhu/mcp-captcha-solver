export const SUBMIT_TIMEOUT = 30000;
export const POLL_TIMEOUT = 15000;

export function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Poll a 2Captcha-compatible `res.php` endpoint. Credentials and task ids are sent
 * in the request body so they never appear in a URL (proxy/access logs, Referer).
 */
export function pollCaptchaResult(baseUrl, apiKey, taskId, extraParams = {}, timeoutMs = POLL_TIMEOUT) {
    const body = new URLSearchParams({
        key: String(apiKey),
        action: 'get',
        id: String(taskId),
        json: '1',
        ...extraParams
    });
    return fetchWithTimeout(`${baseUrl}/res.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    }, timeoutMs);
}
