/**
 * External Captcha Solving Services Integration
 * Provides multiple fallback options for different scenarios
 */

// Base URLs for various services
const SERVICES = {
    zwhyzzz: 'http://ca.zwhyzzz.top:8092/',
    jfbym: 'https://www.jfbym.com/api/YmServer/customApi',
    twoCaptcha: 'https://2captcha.com',
    antiCaptcha: 'https://api.anti-captcha.com',
    captchaAI: 'https://ocr.captchaai.com'
};

/**
 * Solve using the original zwhyzzz service (general captchas)
 */
export async function solveWithZwhyzzz(imageBase64) {
    try {
        const response = await fetch(`${SERVICES.zwhyzzz}identify_GeneralCAPTCHA`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ImageBase64: imageBase64 })
        });

        const data = await response.json();

        if (data.result) {
            return { success: true, result: data.result, service: 'zwhyzzz' };
        }
        return { success: false, error: data.msg || 'Unknown error', service: 'zwhyzzz' };
    } catch (error) {
        return { success: false, error: error.message, service: 'zwhyzzz' };
    }
}

/**
 * Solve using jfbym service (math captchas)
 */
export async function solveWithJfbym(imageBase64, token, type = '50106') {
    try {
        const response = await fetch(SERVICES.jfbym, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageBase64,
                type: type,
                token: token,
                developer_tag: '41acabfb0d980a24e6022e89f9c1bfa4'
            })
        });

        const data = await response.json();
        return { success: true, data, service: 'jfbym' };
    } catch (error) {
        return { success: false, error: error.message, service: 'jfbym' };
    }
}

/**
 * Solve using 2Captcha service
 * Supports: reCAPTCHA, hCaptcha, image captchas, and more
 */
export async function solveWith2Captcha(params) {
    const { apiKey, type = 'image', imageBase64, siteKey, pageUrl } = params;

    if (!apiKey) {
        return { success: false, error: 'API key required for 2Captcha', service: '2captcha' };
    }

    try {
        let submitData;

        if (type === 'image') {
            // Image captcha
            submitData = new URLSearchParams({
                key: apiKey,
                method: 'base64',
                body: imageBase64,
                json: '1'
            });
        } else if (type === 'recaptcha') {
            // reCAPTCHA v2
            submitData = new URLSearchParams({
                key: apiKey,
                method: 'userrecaptcha',
                googlekey: siteKey,
                pageurl: pageUrl,
                json: '1'
            });
        } else if (type === 'hcaptcha') {
            // hCaptcha
            submitData = new URLSearchParams({
                key: apiKey,
                method: 'hcaptcha',
                sitekey: siteKey,
                pageurl: pageUrl,
                json: '1'
            });
        }

        // Submit task
        const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
            method: 'POST',
            body: submitData
        });
        const submitResult = await submitResponse.json();

        if (submitResult.status !== 1) {
            return { success: false, error: submitResult.request, service: '2captcha' };
        }

        const taskId = submitResult.request;

        // Poll for result (max 120 seconds)
        for (let i = 0; i < 24; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));

            const resultResponse = await fetch(
                `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
            );
            const resultData = await resultResponse.json();

            if (resultData.status === 1) {
                return {
                    success: true,
                    result: resultData.request,
                    service: '2captcha',
                    taskId
                };
            }

            if (resultData.request !== 'CAPCHA_NOT_READY') {
                return { success: false, error: resultData.request, service: '2captcha' };
            }
        }

        return { success: false, error: 'Timeout waiting for solution', service: '2captcha' };
    } catch (error) {
        return { success: false, error: error.message, service: '2captcha' };
    }
}

/**
 * Solve using Anti-Captcha service
 */
export async function solveWithAntiCaptcha(params) {
    const { apiKey, type = 'image', imageBase64, siteKey, pageUrl } = params;

    if (!apiKey) {
        return { success: false, error: 'API key required for Anti-Captcha', service: 'anticaptcha' };
    }

    try {
        let taskPayload;

        if (type === 'image') {
            taskPayload = {
                type: 'ImageToTextTask',
                body: imageBase64
            };
        } else if (type === 'recaptcha') {
            taskPayload = {
                type: 'RecaptchaV2TaskProxyless',
                websiteKey: siteKey,
                websiteURL: pageUrl
            };
        } else if (type === 'hcaptcha') {
            taskPayload = {
                type: 'HCaptchaTaskProxyless',
                websiteKey: siteKey,
                websiteURL: pageUrl
            };
        }

        // Create task
        const createResponse = await fetch(`${SERVICES.antiCaptcha}/createTask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: apiKey,
                task: taskPayload
            })
        });
        const createResult = await createResponse.json();

        if (createResult.errorId !== 0) {
            return {
                success: false,
                error: createResult.errorDescription,
                service: 'anticaptcha'
            };
        }

        const taskId = createResult.taskId;

        // Poll for result
        for (let i = 0; i < 24; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));

            const resultResponse = await fetch(`${SERVICES.antiCaptcha}/getTaskResult`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientKey: apiKey,
                    taskId: taskId
                })
            });
            const resultData = await resultResponse.json();

            if (resultData.status === 'ready') {
                return {
                    success: true,
                    result: resultData.solution.text || resultData.solution.gRecaptchaResponse,
                    service: 'anticaptcha',
                    taskId
                };
            }

            if (resultData.errorId !== 0) {
                return {
                    success: false,
                    error: resultData.errorDescription,
                    service: 'anticaptcha'
                };
            }
        }

        return { success: false, error: 'Timeout waiting for solution', service: 'anticaptcha' };
    } catch (error) {
        return { success: false, error: error.message, service: 'anticaptcha' };
    }
}

/**
 * Try multiple services in sequence until one succeeds
 */
export async function solveWithFallback(imageBase64, options = {}) {
    const {
        services = ['zwhyzzz', 'captchaai', '2captcha', 'anticaptcha'],
        apiKeys = {}
    } = options;

    const results = [];

    for (const service of services) {
        let result;

        switch (service) {
            case 'zwhyzzz':
                result = await solveWithZwhyzzz(imageBase64);
                break;
            case '2captcha':
                if (apiKeys.twoCaptcha) {
                    result = await solveWith2Captcha({
                        apiKey: apiKeys.twoCaptcha,
                        imageBase64
                    });
                } else {
                    result = { success: false, error: 'No API key', service: '2captcha' };
                }
                break;
            case 'anticaptcha':
                if (apiKeys.antiCaptcha) {
                    result = await solveWithAntiCaptcha({
                        apiKey: apiKeys.antiCaptcha,
                        imageBase64
                    });
                } else {
                    result = { success: false, error: 'No API key', service: 'anticaptcha' };
                }
                break;
            case 'captchaai':
                if (apiKeys.captchaAI) {
                    result = await solveWith2CaptchaCompatible({
                        apiKey: apiKeys.captchaAI,
                        baseUrl: SERVICES.captchaAI,
                        imageBase64
                    });
                } else {
                    result = { success: false, error: 'No API key', service: 'captchaai' };
                }
                break;
            default:
                result = { success: false, error: 'Unknown service', service };
        }

        results.push(result);

        if (result.success) {
            return {
                success: true,
                result: result.result,
                usedService: service,
                attempts: results
            };
        }
    }

    return {
        success: false,
        error: 'All services failed',
        attempts: results
    };
}

/**
 * Generic solver for any 2Captcha-compatible API (used by CaptchaAI)
 */
async function solveWith2CaptchaCompatible(params) {
    const { apiKey, baseUrl, type = 'image', imageBase64, siteKey, pageUrl } = params;

    if (!apiKey) {
        return { success: false, error: 'API key required', service: 'captchaai' };
    }

    try {
        let submitData;

        if (type === 'image') {
            submitData = new URLSearchParams({
                key: apiKey,
                method: 'base64',
                body: imageBase64,
                json: '1'
            });
        } else if (type === 'recaptcha') {
            submitData = new URLSearchParams({
                key: apiKey,
                method: 'userrecaptcha',
                googlekey: siteKey,
                pageurl: pageUrl,
                json: '1'
            });
        } else if (type === 'hcaptcha') {
            submitData = new URLSearchParams({
                key: apiKey,
                method: 'hcaptcha',
                sitekey: siteKey,
                pageurl: pageUrl,
                json: '1'
            });
        }

        const submitResponse = await fetch(`${baseUrl}/in.php`, {
            method: 'POST',
            body: submitData
        });
        const submitResult = await submitResponse.json();

        if (submitResult.status !== 1) {
            return { success: false, error: submitResult.request, service: 'captchaai' };
        }

        const taskId = submitResult.request;

        for (let i = 0; i < 24; i++) {
            await new Promise(resolve => setTimeout(resolve, 5000));

            const resultResponse = await fetch(
                `${baseUrl}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
            );
            const resultData = await resultResponse.json();

            if (resultData.status === 1) {
                return {
                    success: true,
                    result: resultData.request,
                    service: 'captchaai',
                    taskId
                };
            }

            if (resultData.request !== 'CAPCHA_NOT_READY') {
                return { success: false, error: resultData.request, service: 'captchaai' };
            }
        }

        return { success: false, error: 'Timeout waiting for solution', service: 'captchaai' };
    } catch (error) {
        return { success: false, error: error.message, service: 'captchaai' };
    }
}
