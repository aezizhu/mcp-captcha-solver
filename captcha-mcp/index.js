#!/usr/bin/env node

/**
 * MCP Captcha Solver - Version 3.0
 * 
 * The most comprehensive MCP server for AI captcha solving:
 * - 22+ tools covering every major captcha type
 * - Local OCR (Tesseract.js) - No external API needed
 * - Image Analysis - Type detection, slider solving, grid analysis
 * - External Services - 2Captcha, Anti-Captcha support
 * - Extended Types - FunCaptcha, GeeTest, Turnstile, Audio, Rotate, and more
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tool modules
import { performOCR, performCaptchaOCR, solveMathCaptchaLocally } from './tools/ocr.js';
import {
    analyzeCaptchaType,
    calculateSliderOffset,
    preprocessImage,
    analyzeImageGrid
} from './tools/image-analysis.js';
import {
    solveWithZwhyzzz,
    solveWithJfbym,
    solveWith2Captcha,
    solveWithAntiCaptcha,
    solveWithFallback
} from './tools/services.js';
import {
    solveFunCaptcha,
    solveGeeTestV3,
    solveGeeTestV4,
    solveTurnstile,
    solveAudioCaptcha,
    solveRotateCaptcha,
    solveKeyCaptcha,
    solveLeminCaptcha,
    solveAmazonCaptcha
} from './tools/extended-services.js';

// Create server instance
const server = new Server(
    {
        name: "mcp-captcha-solver",
        version: "3.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Tool definitions
const TOOLS = [
    // === ANALYSIS TOOLS ===
    {
        name: "analyze_captcha",
        description: "Analyze an image to detect what type of captcha it is (text, math, slider, grid selection). Use this first to determine which solving method to use.",
        inputSchema: {
            type: "object",
            properties: {
                imageBase64: {
                    type: "string",
                    description: "Base64 encoded captcha image (without data:image prefix)"
                }
            },
            required: ["imageBase64"]
        }
    },
    {
        name: "preprocess_image",
        description: "Preprocess an image for better OCR results. Apply grayscale, sharpening, thresholding, or inversion.",
        inputSchema: {
            type: "object",
            properties: {
                imageBase64: { type: "string" },
                grayscale: { type: "boolean", default: true },
                sharpen: { type: "boolean", default: true },
                threshold: { type: ["boolean", "integer"] },
                invert: { type: "boolean", default: false }
            },
            required: ["imageBase64"]
        }
    },

    // === LOCAL OCR TOOLS (No External API) ===
    {
        name: "solve_with_local_ocr",
        description: "Solve text captcha using local Tesseract OCR. No external API calls. Best for simple alphanumeric captchas.",
        inputSchema: {
            type: "object",
            properties: {
                imageBase64: { type: "string" },
                language: { type: "string", default: "eng" }
            },
            required: ["imageBase64"]
        }
    },
    {
        name: "solve_math_locally",
        description: "Solve math captcha using local OCR + evaluation. No external API.",
        inputSchema: {
            type: "object",
            properties: {
                imageBase64: { type: "string" }
            },
            required: ["imageBase64"]
        }
    },

    // === SLIDER/PUZZLE TOOLS ===
    {
        name: "calculate_slider_offset",
        description: "Analyze a slider puzzle to estimate drag offset.",
        inputSchema: {
            type: "object",
            properties: {
                backgroundBase64: { type: "string" },
                pieceBase64: { type: "string" }
            },
            required: ["backgroundBase64"]
        }
    },
    {
        name: "analyze_image_grid",
        description: "Analyze image selection grid. Returns cell coordinates for clicking.",
        inputSchema: {
            type: "object",
            properties: {
                imageBase64: { type: "string" },
                gridSize: { type: "integer", default: 3 }
            },
            required: ["imageBase64"]
        }
    },

    // === BASIC EXTERNAL SERVICES ===
    {
        name: "solve_general_captcha",
        description: "Solve general text/number captcha (free, rate-limited)",
        inputSchema: {
            type: "object",
            properties: { imageBase64: { type: "string" } },
            required: ["imageBase64"]
        }
    },
    {
        name: "solve_math_captcha",
        description: "Solve math captcha using jfbym service (requires token)",
        inputSchema: {
            type: "object",
            properties: {
                imageBase64: { type: "string" },
                token: { type: "string" },
                type: { type: "string", default: "50106" }
            },
            required: ["imageBase64", "token"]
        }
    },
    {
        name: "solve_with_2captcha",
        description: "2Captcha: image, reCAPTCHA, hCaptcha",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                captchaType: { type: "string", enum: ["image", "recaptcha", "hcaptcha"] },
                imageBase64: { type: "string" },
                siteKey: { type: "string" },
                pageUrl: { type: "string" }
            },
            required: ["apiKey"]
        }
    },
    {
        name: "solve_with_anticaptcha",
        description: "Anti-Captcha: image, reCAPTCHA, hCaptcha",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                captchaType: { type: "string", enum: ["image", "recaptcha", "hcaptcha"] },
                imageBase64: { type: "string" },
                siteKey: { type: "string" },
                pageUrl: { type: "string" }
            },
            required: ["apiKey"]
        }
    },
    {
        name: "solve_with_fallback",
        description: "Try multiple services in sequence until one succeeds",
        inputSchema: {
            type: "object",
            properties: {
                imageBase64: { type: "string" },
                services: { type: "array", items: { type: "string" } },
                twoCaptchaKey: { type: "string" },
                antiCaptchaKey: { type: "string" }
            },
            required: ["imageBase64"]
        }
    },

    // === EXTENDED CAPTCHA TYPES ===
    {
        name: "solve_funcaptcha",
        description: "Solve FunCaptcha / Arkose Labs (Microsoft, Roblox, EA, GitHub)",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string", description: "2Captcha API key" },
                publicKey: { type: "string", description: "FunCaptcha public key" },
                pageUrl: { type: "string", description: "Page URL" },
                serviceUrl: { type: "string", description: "Optional service URL" }
            },
            required: ["apiKey", "publicKey", "pageUrl"]
        }
    },
    {
        name: "solve_geetest_v3",
        description: "Solve GeeTest v3 slide captcha",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                gt: { type: "string", description: "GeeTest gt value" },
                challenge: { type: "string", description: "GeeTest challenge" },
                pageUrl: { type: "string" }
            },
            required: ["apiKey", "gt", "challenge", "pageUrl"]
        }
    },
    {
        name: "solve_geetest_v4",
        description: "Solve GeeTest v4",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                captchaId: { type: "string", description: "GeeTest v4 captcha_id" },
                pageUrl: { type: "string" }
            },
            required: ["apiKey", "captchaId", "pageUrl"]
        }
    },
    {
        name: "solve_turnstile",
        description: "Solve Cloudflare Turnstile captcha",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                siteKey: { type: "string" },
                pageUrl: { type: "string" }
            },
            required: ["apiKey", "siteKey", "pageUrl"]
        }
    },
    {
        name: "solve_audio_captcha",
        description: "Solve audio captcha (transcribe audio)",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                audioBase64: { type: "string", description: "Base64 encoded audio" },
                audioUrl: { type: "string", description: "Or URL to audio file" },
                lang: { type: "string", default: "en" }
            },
            required: ["apiKey"]
        }
    },
    {
        name: "solve_rotate_captcha",
        description: "Solve rotate captcha (detect correct rotation angle)",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                imageBase64: { type: "string" },
                angle: { type: "integer", default: 360, description: "Maximum rotation angle" }
            },
            required: ["apiKey", "imageBase64"]
        }
    },
    {
        name: "solve_keycaptcha",
        description: "Solve KeyCaptcha puzzle",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                userId: { type: "string" },
                sessionId: { type: "string" },
                webServerSign: { type: "string" },
                webServerSign2: { type: "string" },
                pageUrl: { type: "string" }
            },
            required: ["apiKey", "userId", "sessionId", "webServerSign", "webServerSign2", "pageUrl"]
        }
    },
    {
        name: "solve_lemin_captcha",
        description: "Solve Lemin Cropped captcha",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                captchaId: { type: "string" },
                div_id: { type: "string" },
                pageUrl: { type: "string" }
            },
            required: ["apiKey", "captchaId", "div_id", "pageUrl"]
        }
    },
    {
        name: "solve_amazon_captcha",
        description: "Solve Amazon AWS WAF captcha",
        inputSchema: {
            type: "object",
            properties: {
                apiKey: { type: "string" },
                siteKey: { type: "string" },
                pageUrl: { type: "string" },
                iv: { type: "string", description: "AWS WAF iv value" },
                context: { type: "string", description: "AWS WAF context" }
            },
            required: ["apiKey", "siteKey", "pageUrl", "iv", "context"]
        }
    },

    // === UTILITY TOOLS ===
    {
        name: "unban_ip",
        description: "Attempt to unban your IP from the free service",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "get_captcha_solving_strategy",
        description: "Get recommended strategy for a captcha type",
        inputSchema: {
            type: "object",
            properties: {
                captchaType: {
                    type: "string",
                    enum: [
                        "text", "math", "slider", "recaptcha_v2", "recaptcha_v3",
                        "hcaptcha", "image_selection", "funcaptcha", "geetest",
                        "turnstile", "audio", "rotate", "amazon_waf"
                    ]
                }
            },
            required: ["captchaType"]
        }
    },
    {
        name: "list_supported_captcha_types",
        description: "List all captcha types this MCP can solve",
        inputSchema: { type: "object", properties: {} }
    }
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result;

        switch (name) {
            // Analysis tools
            case "analyze_captcha":
                result = await analyzeCaptchaType(args.imageBase64);
                break;
            case "preprocess_image":
                result = await preprocessImage(args.imageBase64, args);
                break;

            // Local OCR tools
            case "solve_with_local_ocr":
                result = await performCaptchaOCR(args.imageBase64, { lang: args.language || 'eng' });
                break;
            case "solve_math_locally":
                result = await solveMathCaptchaLocally(args.imageBase64);
                break;

            // Slider/puzzle tools
            case "calculate_slider_offset":
                result = await calculateSliderOffset(args.backgroundBase64, args.pieceBase64);
                break;
            case "analyze_image_grid":
                result = await analyzeImageGrid(args.imageBase64, args.gridSize || 3);
                break;

            // Basic external services
            case "solve_general_captcha":
                result = await solveWithZwhyzzz(args.imageBase64);
                break;
            case "solve_math_captcha":
                result = await solveWithJfbym(args.imageBase64, args.token, args.type);
                break;
            case "solve_with_2captcha":
                result = await solveWith2Captcha({
                    apiKey: args.apiKey,
                    type: args.captchaType || 'image',
                    imageBase64: args.imageBase64,
                    siteKey: args.siteKey,
                    pageUrl: args.pageUrl
                });
                break;
            case "solve_with_anticaptcha":
                result = await solveWithAntiCaptcha({
                    apiKey: args.apiKey,
                    type: args.captchaType || 'image',
                    imageBase64: args.imageBase64,
                    siteKey: args.siteKey,
                    pageUrl: args.pageUrl
                });
                break;
            case "solve_with_fallback":
                result = await solveWithFallback(args.imageBase64, {
                    services: args.services,
                    apiKeys: { twoCaptcha: args.twoCaptchaKey, antiCaptcha: args.antiCaptchaKey }
                });
                break;

            // Extended captcha types
            case "solve_funcaptcha":
                result = await solveFunCaptcha(args);
                break;
            case "solve_geetest_v3":
                result = await solveGeeTestV3(args);
                break;
            case "solve_geetest_v4":
                result = await solveGeeTestV4(args);
                break;
            case "solve_turnstile":
                result = await solveTurnstile(args);
                break;
            case "solve_audio_captcha":
                result = await solveAudioCaptcha(args);
                break;
            case "solve_rotate_captcha":
                result = await solveRotateCaptcha(args);
                break;
            case "solve_keycaptcha":
                result = await solveKeyCaptcha(args);
                break;
            case "solve_lemin_captcha":
                result = await solveLeminCaptcha(args);
                break;
            case "solve_amazon_captcha":
                result = await solveAmazonCaptcha(args);
                break;

            // Utility tools
            case "unban_ip":
                try {
                    const response = await fetch('http://ca.zwhyzzz.top:8092/unban');
                    result = { status: response.status, message: await response.text() };
                } catch (error) {
                    result = { error: error.message };
                }
                break;
            case "get_captcha_solving_strategy":
                result = getCaptchaSolvingStrategy(args.captchaType);
                break;
            case "list_supported_captcha_types":
                result = getSupportedCaptchaTypes();
                break;

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
    } catch (error) {
        return {
            content: [{ type: "text", text: JSON.stringify({ error: error.message }) }],
            isError: true
        };
    }
});

/**
 * Get all supported captcha types
 */
function getSupportedCaptchaTypes() {
    return {
        totalTypes: 15,
        categories: {
            "Text-based": [
                { type: "text", tool: "solve_with_local_ocr", apiRequired: false },
                { type: "math", tool: "solve_math_locally", apiRequired: false }
            ],
            "Interactive": [
                { type: "slider", tool: "calculate_slider_offset", apiRequired: false },
                { type: "rotate", tool: "solve_rotate_captcha", apiRequired: true },
                { type: "image_selection", tool: "analyze_image_grid", apiRequired: false }
            ],
            "Token-based": [
                { type: "reCAPTCHA v2", tool: "solve_with_2captcha", apiRequired: true },
                { type: "reCAPTCHA v3", tool: "solve_with_2captcha", apiRequired: true },
                { type: "hCaptcha", tool: "solve_with_2captcha", apiRequired: true },
                { type: "Turnstile", tool: "solve_turnstile", apiRequired: true }
            ],
            "Advanced": [
                { type: "FunCaptcha/Arkose", tool: "solve_funcaptcha", apiRequired: true },
                { type: "GeeTest v3", tool: "solve_geetest_v3", apiRequired: true },
                { type: "GeeTest v4", tool: "solve_geetest_v4", apiRequired: true },
                { type: "KeyCaptcha", tool: "solve_keycaptcha", apiRequired: true },
                { type: "Lemin", tool: "solve_lemin_captcha", apiRequired: true },
                { type: "Amazon WAF", tool: "solve_amazon_captcha", apiRequired: true }
            ],
            "Audio": [
                { type: "audio", tool: "solve_audio_captcha", apiRequired: true }
            ]
        }
    };
}

/**
 * Get recommended strategy for solving a captcha type
 */
function getCaptchaSolvingStrategy(captchaType) {
    const strategies = {
        text: {
            description: "Simple distorted text captcha",
            recommendedTools: ["solve_with_local_ocr", "solve_general_captcha"],
            steps: ["1. Try local OCR first (free)", "2. Fall back to external service"]
        },
        math: {
            description: "Arithmetic expression captcha",
            recommendedTools: ["solve_math_locally"],
            steps: ["1. Use solve_math_locally for instant calculation"]
        },
        slider: {
            description: "Drag slider to complete puzzle",
            recommendedTools: ["calculate_slider_offset"],
            steps: ["1. Get offset", "2. Simulate drag with slight randomness"]
        },
        recaptcha_v2: {
            description: "Google reCAPTCHA v2",
            recommendedTools: ["solve_with_2captcha", "solve_with_anticaptcha"],
            steps: ["1. Extract sitekey", "2. Use external service", "3. Insert token"]
        },
        recaptcha_v3: {
            description: "Invisible reCAPTCHA v3",
            recommendedTools: ["solve_with_2captcha"],
            steps: ["⚠️ Requires API key", "1. Use external service with action parameter"]
        },
        hcaptcha: {
            description: "hCaptcha challenge",
            recommendedTools: ["solve_with_2captcha", "solve_with_anticaptcha"],
            steps: ["1. Similar to reCAPTCHA v2 flow"]
        },
        funcaptcha: {
            description: "FunCaptcha / Arkose Labs",
            recommendedTools: ["solve_funcaptcha"],
            steps: ["1. Extract publicKey", "2. Use solve_funcaptcha"]
        },
        geetest: {
            description: "GeeTest slide captcha",
            recommendedTools: ["solve_geetest_v3", "solve_geetest_v4"],
            steps: ["1. Extract gt/challenge or captcha_id", "2. Use appropriate version"]
        },
        turnstile: {
            description: "Cloudflare Turnstile",
            recommendedTools: ["solve_turnstile"],
            steps: ["1. Extract sitekey", "2. Use solve_turnstile"]
        },
        audio: {
            description: "Audio captcha",
            recommendedTools: ["solve_audio_captcha"],
            steps: ["1. Get audio file URL or base64", "2. Transcribe with solve_audio_captcha"]
        },
        rotate: {
            description: "Rotate image captcha",
            recommendedTools: ["solve_rotate_captcha"],
            steps: ["1. Submit image", "2. Get rotation angle", "3. Apply rotation"]
        },
        amazon_waf: {
            description: "Amazon AWS WAF captcha",
            recommendedTools: ["solve_amazon_captcha"],
            steps: ["1. Extract siteKey, iv, context from page", "2. Use solve_amazon_captcha"]
        },
        image_selection: {
            description: "Select matching images",
            recommendedTools: ["analyze_image_grid", "solve_with_2captcha"],
            steps: ["1. For AI: analyze_image_grid + vision", "2. For guaranteed: external service"]
        }
    };

    return strategies[captchaType] || {
        description: "Unknown type",
        recommendedTools: ["analyze_captcha", "list_supported_captcha_types"],
        steps: ["First detect the captcha type"]
    };
}

// Start server
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Captcha Solver v3.0 running - 22 tools, 15 captcha types");
}

runServer().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
