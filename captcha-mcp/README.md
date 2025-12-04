# MCP Captcha Solver

**AI-Powered Captcha Resolution for Model Context Protocol**

This project provides a Model Context Protocol (MCP) server that enables AI agents (like Claude) to automatically solve captchas. By integrating this server, your AI assistant can navigate web flows that are normally blocked by human verification challenges, such as login screens, form submissions, and data scraping tasks.

It acts as a bridge between your AI client and established third-party captcha solving services, allowing for programmatic resolution of both standard and complex captchas.

## 🚀 Features

*   **General Captcha Solving**: Instantly resolves standard alphanumeric and English text captchas using the `zwhyzzz` service.
*   **Complex Math & Logic Solving**: Handles mathematical problems and more complex visual challenges using the `jfbym` service (requires a user token).
*   **Seamless AI Integration**: Built on the standard Model Context Protocol, making it plug-and-play compatible with Claude Desktop and other MCP-compliant tools.
*   **Self-Healing**: Includes utilities to check service status and attempt IP unbans if rate limits are triggered.

## 🛠️ Prerequisites

*   **Node.js**: Version 18.0.0 or higher.
*   **MCP Client**: An application that supports MCP, such as the [Claude Desktop App](https://claude.ai/download).

## 📦 Installation

1.  **Clone the repository** (or download the source code):
    ```bash
    git clone https://github.com/aezizhu/captcha-solver.git
    cd captcha-solver/captcha-mcp
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build/Verify**:
    You can verify the server starts correctly by running:
    ```bash
    npm start
    ```
    *(Note: It will listen on stdio, so it might not show much output but shouldn't crash immediately.)*

## ⚙️ Configuration

To use this server with the Claude Desktop App, you need to add it to your configuration file.

1.  **Locate your config file**:
    *   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
    *   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2.  **Edit the file** to include the `captcha-solver` server. Replace `/absolute/path/to/...` with the actual path to your `captcha-mcp` directory.

    ```json
    {
      "mcpServers": {
        "captcha-solver": {
          "command": "node",
          "args": [
            "/Users/YOUR_USERNAME/path/to/captcha-solver/captcha-mcp/index.js"
          ]
        }
      }
    }
    ```

3.  **Restart Claude Desktop**: Fully quit and restart the application for the changes to take effect.

## 🔧 Available Tools

Once connected, the AI will have access to the following tools:

### 1. `solve_general_captcha`
Use this for most standard "type the text you see" captchas.
*   **Input**: `imageBase64` (The base64 encoded string of the captcha image, without the `data:image/png;base64,` prefix).
*   **Returns**: The text contained in the captcha.

### 2. `solve_math_captcha`
Use this for math problems (e.g., "1 + 2 = ?") or more difficult captchas.
*   **Input**:
    *   `imageBase64`: The base64 encoded image.
    *   `token`: Your API token for the `jfbym` service.
    *   `type`: (Optional) The captcha type code. Default is `50106` (calculate_ry).
*   **Returns**: The result of the calculation or challenge.

### 3. `unban_ip`
If you encounter rate limiting or IP bans from the free solving service, use this tool to attempt a self-service unban.
*   **Input**: None.
*   **Returns**: Status message indicating if the unban was successful.

### 4. `get_qq_group`
Retrieves the QQ group number for community support regarding the underlying solving service.

## 💡 Usage Tips for AI

When asking Claude to solve a captcha, you can simply provide the image (or describe that there is a captcha on the screen if Claude is viewing it) and ask it to "solve this captcha".

*   **Example Prompt**: "I'm stuck at a login screen with a captcha. Here is the image. Can you solve it for me?"
*   **For Developers**: If you are building an agent, you can extract the captcha image from the DOM (usually an `<img>` or `<canvas>` tag), convert it to base64, and pass it to the `solve_general_captcha` tool.

## ⚠️ Important Notes

*   **Privacy**: Captcha images are sent to external third-party services (`zwhyzzz.top` and `jfbym.com`) for processing. Do not send sensitive personal information through this tool.
*   **Rate Limits**: The free general captcha service may have rate limits. Use the `unban_ip` tool if you get blocked.
*   **Tokens**: For reliable math captcha solving, you will need to obtain a token from the `jfbym` service provider.

## License

MIT License
