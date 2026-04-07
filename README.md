# AI Searcher

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

AI Searcher is a lightweight, high-performance desktop search assistant built with Tauri and React. It provides a minimalist interface for instant access to AI models like OpenAI and Ollama, supporting multi-modal inputs.

### 🌟 Features

*   **Multi-Model Support**: Seamlessly switch between OpenAI-compatible APIs and local Ollama models.
*   **Multi-modal Interaction**: Send images directly via file upload or **paste from clipboard (Ctrl+V)**.
*   **Minimalist UI**: Clean, modern interface with dark/light mode and adjustable scaling.
*   **Global Shortcut**: Quickly toggle the search bar from anywhere (Default: `Alt + Space`).
*   **Reasoning Display**: Support for models with reasoning processes (e.g., DeepSeek).
*   **Performance**: Extremely low resource usage thanks to the Tauri (Rust) backend.

### 🚀 Installation

#### For Users (Direct Download)
1.  Go to the [Releases](https://github.com/your-repo/ai-searcher/releases) page.
2.  Download the latest `.exe` (NSIS) or `.msi` installer for Windows.
3.  Run the installer and follow the instructions.

#### For Developers (Manual Build)
**Prerequisites:**
*   [Node.js](https://nodejs.org/) (LTS)
*   [Rust](https://www.rust-lang.org/tools/install)
*   WebView2 (usually pre-installed on Windows 10/11)

**Steps:**
1.  Clone the repository:
    ```bash
    git clone https://github.com/your-repo/ai-searcher.git
    cd ai-searcher
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Build the application:
    ```bash
    npm run tauri build
    ```
    The installer will be located in `src-tauri/target/release/bundle/`.

### ⌨️ Shortcuts
*   `Alt + Space`: Toggle Search Bar (Show/Hide)
*   `Alt + Q`: Clear input and reset state
*   `Enter`: Send query

---

<a name="chinese"></a>
## 中文

AI Searcher 是一款基于 Tauri 和 React 开发的轻量级、高性能桌面搜索助手。它提供极简的交互界面，让您能够快速唤起并使用 OpenAI 兼容接口或本地 Ollama 模型，并支持多模态输入。

### 🌟 功能亮点

*   **多模型支持**：无缝切换 OpenAI 兼容接口与本地 Ollama 模型。
*   **多模态交互**：支持通过文件上传或 **直接从剪贴板粘贴图片 (Ctrl+V)** 发送给模型。
*   **极简 UI**：现代化的界面设计，支持深/浅色模式切换及全局缩放调节。
*   **全局快捷键**：随时随地快速唤起搜索框（默认：`Alt + Space`）。
*   **思维链显示**：支持显示具有推理过程的模型（如 DeepSeek）的思考步骤。
*   **极致性能**：基于 Tauri (Rust) 后端，占用资源极低。

### 🚀 安装指南

#### 普通用户（直接下载）
1.  前往 [Releases](https://github.com/your-repo/ai-searcher/releases) 页面。
2.  下载最新的 Windows `.exe` (NSIS) 或 `.msi` 安装包。
3.  运行安装程序并按照提示完成安装。

#### 开发者（手动构建）
**环境要求：**
*   [Node.js](https://nodejs.org/) (LTS 版本)
*   [Rust](https://www.rust-lang.org/tools/install) 环境
*   WebView2 (Windows 10/11 通常已内置)

**构建步骤：**
1.  克隆仓库：
    ```bash
    git clone https://github.com/your-repo/ai-searcher.git
    cd ai-searcher
    ```
2.  安装依赖：
    ```bash
    npm install
    ```
3.  打包应用：
    ```bash
    npm run tauri build
    ```
    打包后的安装包将位于 `src-tauri/target/release/bundle/` 目录下。

### ⌨️ 快捷键说明
*   `Alt + Space`：快速唤起/隐藏搜索框
*   `Alt + Q`：清空输入框并重置状态
*   `Enter`：发送提问

---
*Crafted with Love by AI Searcher Team*
