/**
 * Extended Captcha Services - Additional captcha types
 * Supports: FunCaptcha, GeeTest, Turnstile, Audio, Rotate
 */

const SERVICES = {
    twoCaptcha: 'https://2captcha.com',
    antiCaptcha: 'https://api.anti-captcha.com',
    capSolver: 'https://api.capsolver.com'
};

/**
 * Solve FunCaptcha / Arkose Labs
 * Used by: Microsoft, Roblox, EA, GitHub, etc.
 */
export async function solveFunCaptcha(params) {
    const { apiKey, publicKey, pageUrl, serviceUrl, service = '2captcha' } = params;

    if (!apiKey || !publicKey || !pageUrl) {
        return { success: false, error: 'apiKey, publicKey, and pageUrl are required' };
    }

    if (service === '2captcha') {
        try {
            // Submit task
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'funcaptcha',
                publickey: publicKey,
                pageurl: pageUrl,
                surl: serviceUrl || '',
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request, service: '2captcha' };
            }

            // Poll for result
            const taskId = submitResult.request;
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return { success: true, token: resultData.request, service: '2captcha' };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve GeeTest v3 (slide captcha)
 * Used by: Many Chinese websites, some international sites
 */
export async function solveGeeTestV3(params) {
    const { apiKey, gt, challenge, pageUrl, service = '2captcha' } = params;

    if (!apiKey || !gt || !challenge || !pageUrl) {
        return { success: false, error: 'apiKey, gt, challenge, and pageUrl are required' };
    }

    if (service === '2captcha') {
        try {
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'geetest',
                gt: gt,
                challenge: challenge,
                pageurl: pageUrl,
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    // GeeTest returns challenge, validate, seccode
                    return {
                        success: true,
                        solution: resultData.request, // JSON string
                        service: '2captcha'
                    };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve GeeTest v4
 */
export async function solveGeeTestV4(params) {
    const { apiKey, captchaId, pageUrl, service = '2captcha' } = params;

    if (!apiKey || !captchaId || !pageUrl) {
        return { success: false, error: 'apiKey, captchaId, and pageUrl are required' };
    }

    if (service === '2captcha') {
        try {
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'geetest_v4',
                captcha_id: captchaId,
                pageurl: pageUrl,
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return { success: true, solution: resultData.request, service: '2captcha' };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve Cloudflare Turnstile
 * Increasingly common alternative to reCAPTCHA
 */
export async function solveTurnstile(params) {
    const { apiKey, siteKey, pageUrl, service = '2captcha' } = params;

    if (!apiKey || !siteKey || !pageUrl) {
        return { success: false, error: 'apiKey, siteKey, and pageUrl are required' };
    }

    if (service === '2captcha') {
        try {
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'turnstile',
                sitekey: siteKey,
                pageurl: pageUrl,
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return { success: true, token: resultData.request, service: '2captcha' };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve Audio Captcha
 * Downloads audio, transcribes it
 */
export async function solveAudioCaptcha(params) {
    const { apiKey, audioBase64, audioUrl, lang = 'en', service = '2captcha' } = params;

    if (!apiKey) {
        return { success: false, error: 'apiKey is required' };
    }

    if (!audioBase64 && !audioUrl) {
        return { success: false, error: 'Either audioBase64 or audioUrl is required' };
    }

    if (service === '2captcha') {
        try {
            let body;

            if (audioBase64) {
                body = new URLSearchParams({
                    key: apiKey,
                    method: 'audio',
                    body: audioBase64,
                    lang: lang,
                    json: '1'
                });
            } else {
                // Fetch audio first
                const audioResponse = await fetch(audioUrl);
                const audioBuffer = await audioResponse.arrayBuffer();
                const base64 = Buffer.from(audioBuffer).toString('base64');

                body = new URLSearchParams({
                    key: apiKey,
                    method: 'audio',
                    body: base64,
                    lang: lang,
                    json: '1'
                });
            }

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: body
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return { success: true, text: resultData.request, service: '2captcha' };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve Rotate Captcha
 * Rotate image to correct orientation
 */
export async function solveRotateCaptcha(params) {
    const { apiKey, imageBase64, angle = 360, service = '2captcha' } = params;

    if (!apiKey || !imageBase64) {
        return { success: false, error: 'apiKey and imageBase64 are required' };
    }

    if (service === '2captcha') {
        try {
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'rotatecaptcha',
                body: imageBase64,
                angle: angle.toString(),
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return {
                        success: true,
                        rotationAngle: parseInt(resultData.request),
                        service: '2captcha'
                    };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve KeyCaptcha
 */
export async function solveKeyCaptcha(params) {
    const { apiKey, userId, sessionId, webServerSign, webServerSign2, pageUrl, service = '2captcha' } = params;

    if (!apiKey || !userId || !sessionId || !webServerSign || !webServerSign2 || !pageUrl) {
        return { success: false, error: 'All KeyCaptcha parameters are required' };
    }

    if (service === '2captcha') {
        try {
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'keycaptcha',
                s_s_c_user_id: userId,
                s_s_c_session_id: sessionId,
                s_s_c_web_server_sign: webServerSign,
                s_s_c_web_server_sign2: webServerSign2,
                pageurl: pageUrl,
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return { success: true, solution: resultData.request, service: '2captcha' };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve Lemin Captcha
 */
export async function solveLeminCaptcha(params) {
    const { apiKey, captchaId, div_id, pageUrl, service = '2captcha' } = params;

    if (!apiKey || !captchaId || !div_id || !pageUrl) {
        return { success: false, error: 'apiKey, captchaId, div_id, and pageUrl are required' };
    }

    if (service === '2captcha') {
        try {
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'lemin',
                captcha_id: captchaId,
                div_id: div_id,
                pageurl: pageUrl,
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return { success: true, solution: resultData.request, service: '2captcha' };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}

/**
 * Solve Amazon Captcha (AWS WAF)
 */
export async function solveAmazonCaptcha(params) {
    const { apiKey, siteKey, pageUrl, iv, context, service = '2captcha' } = params;

    if (!apiKey || !siteKey || !pageUrl || !iv || !context) {
        return { success: false, error: 'apiKey, siteKey, pageUrl, iv, and context are required' };
    }

    if (service === '2captcha') {
        try {
            const submitData = new URLSearchParams({
                key: apiKey,
                method: 'amazon_waf',
                sitekey: siteKey,
                pageurl: pageUrl,
                iv: iv,
                context: context,
                json: '1'
            });

            const submitResponse = await fetch(`${SERVICES.twoCaptcha}/in.php`, {
                method: 'POST',
                body: submitData
            });
            const submitResult = await submitResponse.json();

            if (submitResult.status !== 1) {
                return { success: false, error: submitResult.request };
            }

            const taskId = submitResult.request;
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 5000));

                const resultResponse = await fetch(
                    `${SERVICES.twoCaptcha}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
                );
                const resultData = await resultResponse.json();

                if (resultData.status === 1) {
                    return { success: true, solution: resultData.request, service: '2captcha' };
                }
                if (resultData.request !== 'CAPCHA_NOT_READY') {
                    return { success: false, error: resultData.request };
                }
            }
            return { success: false, error: 'Timeout' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, error: 'Unsupported service' };
}
