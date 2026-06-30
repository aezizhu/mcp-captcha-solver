/**
 * High-Reliability Captcha Services
 * 
 * Additional providers + cascading fallback for 99%+ success rate
 * Includes: CapSolver, CapMonster Cloud, CaptchaAI, and auto-retry logic
 */

import { fetchWithTimeout, SUBMIT_TIMEOUT, POLL_TIMEOUT } from './utils.js';

const SERVICES = {
    capSolver: 'https://api.capsolver.com',
    capMonster: 'https://api.capmonster.cloud',
    twoCaptcha: 'https://2captcha.com',
    antiCaptcha: 'https://api.anti-captcha.com',
    captchaAI: 'https://ocr.captchaai.com'
};

// Maps service identifiers used in cascade logic to apiKeys property names
const SERVICE_KEY_MAP = {
    capsolver: 'capsolver',
    capmonster: 'capmonster',
    '2captcha': 'twoCaptcha',
    anticaptcha: 'antiCaptcha',
    captchaai: 'captchaAI'
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/**
 * CapSolver - Fast, high-accuracy solver
 * Supports: image, reCAPTCHA, hCaptcha, FunCaptcha, GeeTest, Turnstile
 */
export async function solveWithCapSolver(params) {
    const { apiKey, taskType, ...taskParams } = params;

    if (!apiKey) {
        return { success: false, error: 'CapSolver API key required' };
    }

    try {
        // Create task
        const createResponse = await fetchWithTimeout(`${SERVICES.capSolver}/createTask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: apiKey,
                task: { type: taskType, ...taskParams }
            })
        }, SUBMIT_TIMEOUT);
        const createResult = await createResponse.json();

        if (createResult.errorId !== 0) {
            return { success: false, error: createResult.errorDescription };
        }

        const taskId = createResult.taskId;

        // Poll for result (max 120s)
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 3000));

            const getResponse = await fetchWithTimeout(`${SERVICES.capSolver}/getTaskResult`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: apiKey, taskId })
            }, POLL_TIMEOUT);
            const getResult = await getResponse.json();

            if (getResult.status === 'ready') {
                return { success: true, solution: getResult.solution, service: 'capsolver' };
            }
            if (getResult.errorId !== 0) {
                return { success: false, error: getResult.errorDescription };
            }
        }
        return { success: false, error: 'Timeout' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * CapMonster Cloud - Another high-accuracy option
 */
export async function solveWithCapMonster(params) {
    const { apiKey, taskType, ...taskParams } = params;

    if (!apiKey) {
        return { success: false, error: 'CapMonster API key required' };
    }

    try {
        const createResponse = await fetchWithTimeout(`${SERVICES.capMonster}/createTask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientKey: apiKey,
                task: { type: taskType, ...taskParams }
            })
        }, SUBMIT_TIMEOUT);
        const createResult = await createResponse.json();

        if (createResult.errorId !== 0) {
            return { success: false, error: createResult.errorDescription };
        }

        const taskId = createResult.taskId;

        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 3000));

            const getResponse = await fetchWithTimeout(`${SERVICES.capMonster}/getTaskResult`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: apiKey, taskId })
            }, POLL_TIMEOUT);
            const getResult = await getResponse.json();

            if (getResult.status === 'ready') {
                return { success: true, solution: getResult.solution, service: 'capmonster' };
            }
            if (getResult.errorId !== 0) {
                return { success: false, error: getResult.errorDescription };
            }
        }
        return { success: false, error: 'Timeout' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * CaptchaAI - 2Captcha-compatible API with different base URL
 * Supports: image, reCAPTCHA, hCaptcha, Turnstile, GeeTest, FunCaptcha
 */
export async function solveWithCaptchaAI(params) {
    const { apiKey, captchaType = 'image', ...captchaParams } = params;

    if (!apiKey) {
        return { success: false, error: 'CaptchaAI API key required' };
    }

    const result = await solveCaptchaAIByType(captchaType, { apiKey, ...captchaParams });
    return { ...result, service: 'captchaai' };
}

/**
 * Cascading Solver - Try multiple services until one succeeds
 * This is the key to 99%+ success rate
 */
export async function solveWithCascade(params) {
    const {
        captchaType,
        imageBase64,
        siteKey,
        pageUrl,
        gt,
        challenge,
        publicKey,
        apiKeys = {},
        services = ['capsolver', 'capmonster', 'captchaai', '2captcha', 'anticaptcha']
    } = params;

    const attempts = [];

    for (const service of services) {
        const keyName = SERVICE_KEY_MAP[service] || service;
        const apiKey = apiKeys[keyName];
        if (!apiKey) {
            attempts.push({ service, skipped: true, reason: 'No API key' });
            continue;
        }

        let result;

        // Retry up to MAX_RETRIES times per service
        for (let retry = 0; retry < MAX_RETRIES; retry++) {
            try {
                switch (service) {
                    case 'capsolver':
                        result = await solveCapSolverByType(captchaType, { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey });
                        break;
                    case 'capmonster':
                        result = await solveCapMonsterByType(captchaType, { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey });
                        break;
                    case '2captcha':
                        result = await solve2CaptchaByType(captchaType, { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey });
                        break;
                    case 'anticaptcha':
                        result = await solveAntiCaptchaByType(captchaType, { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey });
                        break;
                    case 'captchaai':
                        result = await solveCaptchaAIByType(captchaType, { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey });
                        break;
                }

                if (result.success) {
                    return {
                        success: true,
                        solution: result.solution || result.result || result.token,
                        service,
                        attempts: [...attempts, { service, success: true, retry }]
                    };
                }
            } catch (error) {
                result = { success: false, error: error.message };
            }

            if (retry < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY));
            }
        }

        attempts.push({ service, success: false, error: result?.error });
    }

    return {
        success: false,
        error: 'All services failed',
        attempts
    };
}

// Helper functions to route to correct task type per service
async function solveCapSolverByType(captchaType, params) {
    const taskTypes = {
        image: 'ImageToTextTask',
        recaptcha: 'ReCaptchaV2TaskProxyLess',
        recaptcha_v3: 'ReCaptchaV3TaskProxyLess',
        hcaptcha: 'HCaptchaTaskProxyLess',
        funcaptcha: 'FunCaptchaTaskProxyLess',
        turnstile: 'AntiTurnstileTaskProxyLess',
        geetest: 'GeeTestTaskProxyLess'
    };

    const taskType = taskTypes[captchaType] || 'ImageToTextTask';

    const taskParams = {};
    if (params.imageBase64) taskParams.body = params.imageBase64;
    if (params.siteKey) taskParams.websiteKey = params.siteKey;
    if (params.pageUrl) taskParams.websiteURL = params.pageUrl;
    if (captchaType === 'geetest') {
        if (params.gt) taskParams.gt = params.gt;
        if (params.challenge) taskParams.challenge = params.challenge;
    }
    if (captchaType === 'funcaptcha' && params.publicKey) {
        taskParams.websitePublicKey = params.publicKey;
    }

    return solveWithCapSolver({ apiKey: params.apiKey, taskType, ...taskParams });
}

async function solveCapMonsterByType(captchaType, params) {
    const taskTypes = {
        image: 'ImageToTextTask',
        recaptcha: 'NoCaptchaTaskProxyless',
        hcaptcha: 'HCaptchaTaskProxyless',
        funcaptcha: 'FunCaptchaTaskProxyless',
        turnstile: 'TurnstileTaskProxyless',
        geetest: 'GeeTestTaskProxyless'
    };

    const taskType = taskTypes[captchaType] || 'ImageToTextTask';

    const taskParams = {};
    if (params.imageBase64) taskParams.body = params.imageBase64;
    if (params.siteKey) taskParams.websiteKey = params.siteKey;
    if (params.pageUrl) taskParams.websiteURL = params.pageUrl;
    if (captchaType === 'geetest') {
        if (params.gt) taskParams.gt = params.gt;
        if (params.challenge) taskParams.challenge = params.challenge;
    }
    if (captchaType === 'funcaptcha' && params.publicKey) {
        taskParams.websitePublicKey = params.publicKey;
    }

    return solveWithCapMonster({ apiKey: params.apiKey, taskType, ...taskParams });
}

async function solve2CaptchaByType(captchaType, params) {
    // Uses existing 2Captcha implementation pattern
    const { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey } = params;

    let method, body;
    switch (captchaType) {
        case 'image':
            method = 'base64';
            body = new URLSearchParams({ key: apiKey, method, body: imageBase64, json: '1' });
            break;
        case 'recaptcha':
            method = 'userrecaptcha';
            body = new URLSearchParams({ key: apiKey, method, googlekey: siteKey, pageurl: pageUrl, json: '1' });
            break;
        case 'hcaptcha':
            method = 'hcaptcha';
            body = new URLSearchParams({ key: apiKey, method, sitekey: siteKey, pageurl: pageUrl, json: '1' });
            break;
        case 'turnstile':
            method = 'turnstile';
            body = new URLSearchParams({ key: apiKey, method, sitekey: siteKey, pageurl: pageUrl, json: '1' });
            break;
        case 'recaptcha_v3':
            method = 'userrecaptcha';
            body = new URLSearchParams({ key: apiKey, method, googlekey: siteKey, pageurl: pageUrl, version: 'v3', json: '1' });
            break;
        case 'geetest':
            method = 'geetest';
            body = new URLSearchParams({ key: apiKey, method, gt, challenge, pageurl: pageUrl, json: '1' });
            break;
        case 'funcaptcha':
            method = 'funcaptcha';
            body = new URLSearchParams({ key: apiKey, method, publickey: publicKey, pageurl: pageUrl, json: '1' });
            break;
        default:
            return { success: false, error: `Unsupported 2Captcha captchaType: ${captchaType}` };
    }

    try {
        const submitResponse = await fetchWithTimeout('https://2captcha.com/in.php', { method: 'POST', body }, SUBMIT_TIMEOUT);
        const submitResult = await submitResponse.json();

        if (submitResult.status !== 1) {
            return { success: false, error: submitResult.request };
        }

        const taskId = submitResult.request;
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const resultResponse = await fetchWithTimeout(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`, {}, POLL_TIMEOUT);
            const resultData = await resultResponse.json();
            if (resultData.status === 1) {
                return { success: true, result: resultData.request };
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

async function solveCaptchaAIByType(captchaType, params) {
    const { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey } = params;
    const BASE = SERVICES.captchaAI;

    let method, body;
    switch (captchaType) {
        case 'image':
            method = 'base64';
            body = new URLSearchParams({ key: apiKey, method, body: imageBase64, json: '1' });
            break;
        case 'recaptcha':
            method = 'userrecaptcha';
            body = new URLSearchParams({ key: apiKey, method, googlekey: siteKey, pageurl: pageUrl, json: '1' });
            break;
        case 'recaptcha_v3':
            method = 'userrecaptcha';
            body = new URLSearchParams({ key: apiKey, method, googlekey: siteKey, pageurl: pageUrl, version: 'v3', json: '1' });
            break;
        case 'hcaptcha':
            method = 'hcaptcha';
            body = new URLSearchParams({ key: apiKey, method, sitekey: siteKey, pageurl: pageUrl, json: '1' });
            break;
        case 'turnstile':
            method = 'turnstile';
            body = new URLSearchParams({ key: apiKey, method, sitekey: siteKey, pageurl: pageUrl, json: '1' });
            break;
        case 'geetest':
            method = 'geetest';
            body = new URLSearchParams({ key: apiKey, method, gt: gt || siteKey, challenge: challenge || '', pageurl: pageUrl, json: '1' });
            break;
        case 'funcaptcha':
            method = 'funcaptcha';
            body = new URLSearchParams({ key: apiKey, method, publickey: publicKey || siteKey, pageurl: pageUrl, json: '1' });
            break;
        default:
            return { success: false, error: `Unsupported CaptchaAI captchaType: ${captchaType}` };
    }

    try {
        const submitResponse = await fetchWithTimeout(`${BASE}/in.php`, { method: 'POST', body }, SUBMIT_TIMEOUT);
        const submitResult = await submitResponse.json();

        if (submitResult.status !== 1) {
            return { success: false, error: submitResult.request };
        }

        const taskId = submitResult.request;
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const resultResponse = await fetchWithTimeout(`${BASE}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`, {}, POLL_TIMEOUT);
            const resultData = await resultResponse.json();
            if (resultData.status === 1) {
                return { success: true, result: resultData.request };
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

async function solveAntiCaptchaByType(captchaType, params) {
    const { apiKey, imageBase64, siteKey, pageUrl, gt, challenge, publicKey } = params;

    const taskTypes = {
        image: { type: 'ImageToTextTask', body: imageBase64 },
        recaptcha: { type: 'RecaptchaV2TaskProxyless', websiteKey: siteKey, websiteURL: pageUrl },
        recaptcha_v3: { type: 'RecaptchaV3TaskProxyless', websiteKey: siteKey, websiteURL: pageUrl, minScore: 0.7 },
        hcaptcha: { type: 'HCaptchaTaskProxyless', websiteKey: siteKey, websiteURL: pageUrl },
        turnstile: { type: 'TurnstileTaskProxyless', websiteKey: siteKey, websiteURL: pageUrl },
        geetest: { type: 'GeeTestTaskProxyless', websiteURL: pageUrl, gt: gt, challenge: challenge },
        funcaptcha: { type: 'FunCaptchaTaskProxyless', websiteURL: pageUrl, websitePublicKey: publicKey }
    };

    const task = taskTypes[captchaType];
    if (!task) {
        return { success: false, error: `Unsupported Anti-Captcha captchaType: ${captchaType}` };
    }

    try {
        const createResponse = await fetchWithTimeout('https://api.anti-captcha.com/createTask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: apiKey, task })
        }, SUBMIT_TIMEOUT);
        const createResult = await createResponse.json();

        if (createResult.errorId !== 0) {
            return { success: false, error: createResult.errorDescription };
        }

        const taskId = createResult.taskId;
        for (let i = 0; i < 40; i++) {
            await new Promise(r => setTimeout(r, 5000));

            const resultResponse = await fetchWithTimeout(`https://api.anti-captcha.com/getTaskResult`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientKey: apiKey, taskId })
            }, POLL_TIMEOUT);
            const resultData = await resultResponse.json();

            if (resultData.status === 'ready') {
                return { success: true, solution: resultData.solution, service: 'anticaptcha', taskId };
            }

            if (resultData.errorId !== 0) {
                return { success: false, error: resultData.errorDescription, service: 'anticaptcha' };
            }
        }

        return { success: false, error: 'Timeout waiting for solution', service: 'anticaptcha' };
    } catch (error) {
        return { success: false, error: error.message, service: 'anticaptcha' };
    }
}

/**
 * Universal Solver - The primary tool AI should use
 * Automatically selects the best approach and cascades through services
 */
export async function solveAnyCaptcha(params) {
    const {
        captchaType = 'image',
        imageBase64,
        siteKey,
        pageUrl,
        gt,
        challenge,
        publicKey,
        apiKeys = {}
    } = params;

    // Determine available services based on provided keys
    const availableServices = [];
    if (apiKeys.capsolver) availableServices.push('capsolver');
    if (apiKeys.capmonster) availableServices.push('capmonster');
    if (apiKeys.captchaAI) availableServices.push('captchaai');
    if (apiKeys.twoCaptcha) availableServices.push('2captcha');
    if (apiKeys.antiCaptcha) availableServices.push('anticaptcha');

    if (availableServices.length === 0) {
        return {
            success: false,
            error: 'No API keys provided. For 99%+ success rate, at least one service API key is required.',
            hint: 'Add apiKeys: { capsolver: "...", captchaAI: "...", twoCaptcha: "...", etc. }'
        };
    }

    return solveWithCascade({
        captchaType,
        imageBase64,
        siteKey,
        pageUrl,
        gt,
        challenge,
        publicKey,
        apiKeys,
        services: availableServices
    });
}
