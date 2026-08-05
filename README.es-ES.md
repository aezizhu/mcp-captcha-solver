

# MCP Captcha Solver

**Resolución de Captchas Impulsada por IA para el Protocolo de Contexto de Modelos**

Un conjunto de herramientas integral para que los agentes de IA resuelvan diversos desafíos de captcha: desde texto simple hasta reCAPTCHA complejo.

## 🚀 Inicio Rápido

```bash
cd captcha-mcp
npm install
npm start
```

## 📂 Contenidos

| Directorio | Descripción |
|-----------|-------------|
| [captcha-mcp/](captcha-mcp/) | **Servidor MCP** - 29 herramientas para resolución de captchas |
| [captcha_solver.js](captcha_solver.js) | Script original de Tampermonkey |

## ✨ Capacidades

- **OCR local** - Tesseract.js (sin API externa)
- **Captchas de deslizamiento** - Detección de bordes para cálculo de desplazamiento
- **Análisis de cuadrícula** - Mapeo de coordenadas para selección de imágenes
- **Servicios externos** - CapSolver, CapMonster, CaptchaAI, 2Captcha, Anti-Captcha
- **Fallback inteligente** - Cambio automático de servicios

➡️ **[Documentación Completa](captcha-mcp/README.md)**

## Licencia

MIT
