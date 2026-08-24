/**
 * Image Analysis Tools - For slider puzzles, object detection hints, and preprocessing
 */

import { decodeImageBase64, openImage, readImageMetadata, validateGridSize, validateResizeDimension } from './security.js';

/**
 * Analyze image to detect captcha type
 * @param {string} imageBase64 - Base64 encoded image
 * @returns {Promise<object>} Analysis result with detected type
 */
export async function analyzeCaptchaType(imageBase64) {
    try {
        const buffer = decodeImageBase64(imageBase64);
        const metadata = await readImageMetadata(buffer);
        const stats = await openImage(buffer).stats();

        const analysis = {
            width: metadata.width,
            height: metadata.height,
            aspectRatio: (metadata.width / metadata.height).toFixed(2),
            channels: metadata.channels,
            colorVariance: stats.channels.map(c => c.stdev)
        };

        // Heuristic detection
        let detectedType = 'unknown';
        let confidence = 0.5;
        let hints = [];

        // Text captcha heuristics
        if (analysis.aspectRatio > 2 && analysis.aspectRatio < 5) {
            detectedType = 'text';
            confidence = 0.7;
            hints.push('Wide aspect ratio suggests text captcha');
        }

        // Slider puzzle heuristics
        if (Math.abs(analysis.aspectRatio - 1) < 0.3) {
            if (analysis.width > 200) {
                detectedType = 'slider';
                confidence = 0.6;
                hints.push('Square-ish large image suggests slider puzzle');
            }
        }

        // Math captcha heuristics
        if (analysis.aspectRatio > 1.5 && analysis.aspectRatio < 3) {
            detectedType = 'text_or_math';
            confidence = 0.6;
            hints.push('Could be text or math captcha');
        }

        // Image selection heuristics
        if (analysis.aspectRatio > 0.8 && analysis.aspectRatio < 1.3 && analysis.width > 300) {
            detectedType = 'grid_selection';
            confidence = 0.5;
            hints.push('Large square image may be grid selection');
        }

        return {
            success: true,
            detectedType,
            confidence,
            hints,
            metadata: analysis
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Calculate slider offset by finding puzzle piece position
 * Uses edge detection to find the gap/piece
 * @param {string} backgroundBase64 - Background image
 * @param {string} pieceBase64 - Puzzle piece (optional)
 * @returns {Promise<object>} Offset calculation result
 */
export async function calculateSliderOffset(backgroundBase64, pieceBase64 = null) {
    try {
        const bgBuffer = decodeImageBase64(backgroundBase64, 'backgroundBase64');
        await readImageMetadata(bgBuffer);

        // Convert to grayscale and detect edges
        const edgeBuffer = await openImage(bgBuffer)
            .greyscale()
            .convolve({
                width: 3,
                height: 3,
                kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] // Laplacian edge detection
            })
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { data, info } = edgeBuffer;
        const { width, height } = info;

        // Scan columns to find sudden changes (gap location)
        const columnIntensities = [];
        for (let x = 0; x < width; x++) {
            let sum = 0;
            for (let y = 0; y < height; y++) {
                sum += data[y * width + x];
            }
            columnIntensities.push(sum / height);
        }

        // Find peaks (likely gap edges)
        const peaks = [];
        const threshold = Math.max(...columnIntensities) * 0.6;

        for (let i = 10; i < columnIntensities.length - 10; i++) {
            if (columnIntensities[i] > threshold) {
                if (columnIntensities[i] > columnIntensities[i - 1] &&
                    columnIntensities[i] > columnIntensities[i + 1]) {
                    peaks.push({ x: i, intensity: columnIntensities[i] });
                }
            }
        }

        // Sort by intensity and get the most likely gap position
        peaks.sort((a, b) => b.intensity - a.intensity);

        const estimatedOffset = peaks.length > 0 ? peaks[0].x : Math.floor(width / 2);

        return {
            success: true,
            estimatedOffset,
            confidence: peaks.length > 0 ? 0.7 : 0.3,
            imageWidth: width,
            peaksFound: peaks.length,
            hint: `Drag slider approximately ${estimatedOffset} pixels from left`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Preprocess image for better OCR
 * @param {string} imageBase64 - Base64 encoded image
 * @param {object} options - Preprocessing options
 * @returns {Promise<object>} Preprocessed image base64
 */
export async function preprocessImage(imageBase64, options = {}) {
    const {
        grayscale = true,
        sharpen = true,
        threshold = false,
        invert = false,
        resize = null
    } = options;

    try {
        const buffer = decodeImageBase64(imageBase64);
        await readImageMetadata(buffer);
        let pipeline = openImage(buffer);

        if (resize) {
            const width = validateResizeDimension(resize.width, 'resize.width');
            const height = validateResizeDimension(resize.height, 'resize.height');
            pipeline = pipeline.resize(width, height, { fit: 'fill' });
        }

        if (grayscale) {
            pipeline = pipeline.greyscale();
        }

        if (sharpen) {
            pipeline = pipeline.sharpen();
        }

        if (threshold) {
            pipeline = pipeline.threshold(threshold === true ? 128 : threshold);
        }

        if (invert) {
            pipeline = pipeline.negate();
        }

        const outputBuffer = await pipeline.png().toBuffer();
        const outputBase64 = outputBuffer.toString('base64');

        return {
            success: true,
            imageBase64: outputBase64
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Detect grid structure for image selection captchas
 * @param {string} imageBase64 - Base64 encoded image
 * @param {number} expectedGrid - Expected grid size (e.g., 3 for 3x3, 4 for 4x4)
 * @returns {Promise<object>} Grid analysis result
 */
export async function analyzeImageGrid(imageBase64, expectedGrid = 3) {
    try {
        const gridSize = validateGridSize(expectedGrid);
        const buffer = decodeImageBase64(imageBase64);
        const metadata = await readImageMetadata(buffer);

        const cellWidth = Math.floor(metadata.width / gridSize);
        const cellHeight = Math.floor(metadata.height / gridSize);

        const cells = [];
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                cells.push({
                    index: row * gridSize + col,
                    row,
                    col,
                    x: col * cellWidth,
                    y: row * cellHeight,
                    width: cellWidth,
                    height: cellHeight,
                    centerX: col * cellWidth + cellWidth / 2,
                    centerY: row * cellHeight + cellHeight / 2
                });
            }
        }

        return {
            success: true,
            gridSize,
            totalCells: gridSize * gridSize,
            cellDimensions: { width: cellWidth, height: cellHeight },
            cells,
            hint: `Image appears to be a ${gridSize}x${gridSize} grid. Click on cell centers to select.`
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
