# MCP Captcha Solver

**The World's Most Comprehensive AI Captcha Solving MCP**

22+ tools. 15 captcha types. One MCP server.

## 🚀 Supported Captcha Types

| Category | Types | API Required |
|----------|-------|--------------|
| **Text-based** | Text OCR, Math expressions | ❌ No |
| **Interactive** | Slider, Rotate, Image grid | ❌/✅ Mixed |
| **Token-based** | reCAPTCHA v2/v3, hCaptcha, Turnstile | ✅ Yes |
| **Advanced** | FunCaptcha, GeeTest v3/v4, KeyCaptcha, Lemin, Amazon WAF | ✅ Yes |
| **Audio** | Audio captcha transcription | ✅ Yes |

## 📦 Installation

```bash
cd captcha-mcp
npm install
npm start
```

## ⚙️ MCP Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "captcha-solver": {
      "command": "node",
      "args": ["/path/to/captcha-mcp/index.js"]
    }
  }
}
```

## 🔧 All 22 Tools

### No API Required (Free)
| Tool | Purpose |
|------|---------|
| `analyze_captcha` | Detect captcha type |
| `preprocess_image` | Enhance for better OCR |
| `solve_with_local_ocr` | Tesseract text recognition |
| `solve_math_locally` | OCR + auto-calculate |
| `calculate_slider_offset` | Estimate drag distance |
| `analyze_image_grid` | Get cell coordinates |

### Basic Services
| Tool | Purpose |
|------|---------|
| `solve_general_captcha` | Free text solver (rate-limited) |
| `solve_math_captcha` | jfbym math solver |
| `solve_with_2captcha` | 2Captcha (image/reCAPTCHA/hCaptcha) |
| `solve_with_anticaptcha` | Anti-Captcha integration |
| `solve_with_fallback` | Auto-retry multiple services |

### Extended Types (API Required)
| Tool | Captcha Type |
|------|--------------|
| `solve_funcaptcha` | FunCaptcha / Arkose Labs |
| `solve_geetest_v3` | GeeTest v3 |
| `solve_geetest_v4` | GeeTest v4 |
| `solve_turnstile` | Cloudflare Turnstile |
| `solve_audio_captcha` | Audio transcription |
| `solve_rotate_captcha` | Rotate to correct angle |
| `solve_keycaptcha` | KeyCaptcha puzzle |
| `solve_lemin_captcha` | Lemin Cropped |
| `solve_amazon_captcha` | Amazon AWS WAF |

### Utilities
| Tool | Purpose |
|------|---------|
| `unban_ip` | Self-service IP unban |
| `get_captcha_solving_strategy` | Get recommended approach |
| `list_supported_captcha_types` | List all types with tools |

## 💡 Usage Flow

```
1. AI encounters captcha
2. Use `analyze_captcha` to detect type
3. Use `get_captcha_solving_strategy` for recommended tool
4. Execute appropriate solver
5. Apply result (fill text, submit token, drag slider)
```

## 🏆 Why This MCP?

- **Most comprehensive**: 15 captcha types vs 1-3 in alternatives
- **Zero-config for basics**: Local OCR works instantly, no API key needed
- **Smart fallback**: Auto-retry across services
- **AI-first design**: Strategy guidance tells AI which tool to use

## License

MIT
