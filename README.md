# Drugxsearch-AI 垂直领域深度研究工具 (AI Vertical Domain Research Tool)

一个纯前端、注重隐私、高度可定制的AI研究工具。您只需输入一个复杂问题，AI Agent便会自动为您完成**智能规划、多源搜索、筛选分析、并综合成一份精炼的研究报告**。

<img width="1805" height="3690" alt="AI搜索结果" src="https://github.com/user-attachments/assets/4bf205c9-5771-4caa-b91d-c92ad538620e" />

## ✨ 核心功能

- **🤖 灵活的多模型支持**:
  - **支持 Google Gemini**: 直接集成 Google 的 Gemini 系列模型。
  - **支持 OpenAI 兼容 API**: 可以接入任何提供 OpenAI 格式 API 的模型，例如 **DeepSeek**, **月之暗面(Moonshot AI)**, **Kimi**，以及通过 `Ollama` 或 `LM Studio` 部署的本地大模型。

- **🧠 可定制的 AI 任务分配**:
  - 您可以为研究流程中的不同环节（**1. 规划分解**、**2. 结果分析**、**3. 总结报告**）指派不同的AI模型。
  - **策略示例**: 使用一个轻量、快速、便宜的模型（如 `gemini-1.5-flash` 或 `deepseek-chat`）进行规划和分析，同时使用一个更强大、更擅长写作的模型（如 `gemini-1.5-pro` 或其他高级模型）来生成最终的综合报告，实现成本与效果的最佳平衡。

- **🔍 混合式搜索策略**:
  - **通用搜索**: 利用 **Tavily Search API** 进行广泛的互联网信息检索。
  - **垂直领域搜索**: 允许用户配置多个 **Google 自定义搜索引擎 (CSE)**。AI会智能判断何时调用这些专业搜索引擎以获取更精准、更深入的垂直领域信息（例如，特定行业的数据库、专利网站等）。

- **📖 深度原文阅读 (可选)**:
  - 集成 **Jina Reader API**，当AI筛选出最核心的几篇信息源后，可自动抓取并阅读这些网页的全文内容，而不仅仅是依赖搜索摘要。这使得最终报告的信息密度和准确性远超传统AI问答。

- **👁️ 透明化的工作流**:
  - 通过交互式时间轴，实时展示AI的工作状态和每一步的决策过程。用户可以清晰地看到AI**如何规划查询**、**执行了哪些搜索**、**筛选了哪些结果**，让整个研究过程不再是黑箱。

- **🔒 隐私优先**:
  - 这是一个**纯前端应用**，所有计算都在您的浏览器中完成。
  - 您的所有 **API 密钥**、配置信息和历史记录都只安全地存储在**浏览器本地存储 (LocalStorage)** 中，**不会上传到任何服务器**，完全消除了隐私泄露的风险。

- **⚙️ 便捷的配置管理**:
  - 支持一键**导出和导入配置文件** (`.json`格式)。方便您在不同设备间迁移配置，或与他人分享您的AI模型和搜索引擎设置。

<img width="816" height="2980" alt="AI搜索配置中心" src="https://github.com/user-attachments/assets/43ae55fc-993e-43de-aefd-9db5719750a3" />

## 🚀 如何开始

本项目无需安装，只需下载文件并在浏览器中打开即可。

1.  **下载代码**
    -   直接下载本仓库的 ZIP 压缩包并解压。
    -   或者使用 Git: `git clone https://github.com/your-username/your-repo-name.git`

2.  **打开应用**
    -   在文件管理器中，直接用您的浏览器（推荐 Chrome, Edge, Firefox 等现代浏览器）打开 `index.html` 文件。

3.  **进行配置**
    -   应用首次启动时会自动进入**配置中心**页面。您需要在这里填入必要的API密钥和设置AI模型。

## 🛠️ 配置指南

在配置中心，您需要完成以下几个部分的设置：

### 1. AI 模型配置

这是最核心的部分。您可以添加一个或多个AI模型。

#### 添加一个 OpenAI 兼容模型 (以 DeepSeek 为例)

1.  点击 `+ 添加一个AI模型` 按钮。
2.  填写以下字段：
    -   **模型名称**: 自定义一个好记的名字，例如 `DeepSeek 主力模型`。
    -   **模型提供商**: 选择 `OpenAI 兼容`。
    -   **API Key**: 填入您的 DeepSeek API Key (以 `sk-` 开头)。
    -   **Base URL**: 填入 DeepSeek 的 API 地址 `https://api.deepseek.com`。
    -   **模型标识**: 填入模型名称，例如 `deepseek-chat`。

    ```
    // DeepSeek 配置示例
    {
      "name": "DeepSeek 主力模型",
      "provider": "openai",
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "[https://api.deepseek.com](https://api.deepseek.com)",
      "model": "deepseek-chat"
    }
    ```

#### 添加一个 Google Gemini 模型

1.  点击 `+ 添加一个AI模型` 按钮。
2.  填写以下字段：
    -   **模型名称**: 例如 `Gemini Flash`。
    -   **模型提供商**: 选择 `Google Gemini`。
    -   **API Key**: 填入您的 Google Gemini API Key。
    -   **Base URL**: 此项会自动隐藏，无需填写。
    -   **模型标识**: 填入模型名称，例如 `gemini-1.5-flash`。

    ```
    // Gemini 配置示例
    {
      "name": "Gemini Flash",
      "provider": "gemini",
      "apiKey": "AIzaSyxxxxxxxxxxxxxxxxxxxx",
      "baseUrl": "",
      "model": "gemini-1.5-flash"
    }
    ```

### 2. AI 任务分配

在添加完至少一个AI模型后，您必须为流程的三个关键步骤分别指派一个模型：
- **1. 规划与分解**: 负责理解问题并制定搜索策略。
- **2. 结果筛选与分析**: 负责在众多搜索结果中筛选出最相关的内容。
- **3. 总结与报告生成**: 负责阅读所有材料并撰写最终报告。

从下拉菜单中选择您在上一步中配置好的模型即可。

### 3. 搜索引擎 API

- **Tavily API Key**: **（必需）** 用于进行通用网络搜索。请前往 [Tavily AI](https://tavily.com/) 注册并获取免费的API Key。
- **Jina Reader API Key**: **（可选）** 用于深度阅读网页原文。若不填写，AI将仅根据搜索结果的摘要生成报告。请前往 [Jina AI](https://jina.ai/reader/) 获取API Key。

### 4. Google 自定义搜索引擎 (CSE)

**（可选，但强烈推荐用于专业领域）**
通过配置Google CSE，您可以创建只在特定网站（如政府网站、学术数据库、特定论坛）内进行搜索的引擎。
- **说明**: 用清晰的语言描述这个CSE的用途，AI会根据这个描述来判断是否使用它。
- **Google API Key & CSE ID**: 请前往 [Google Cloud Console](https://console.cloud.google.com/) 和 [Programmable Search Engine](https://programmablesearchengine.google.com/) 创建和获取。

---

配置完成后，点击页面底部的 `保存配置并开始` 按钮，即可开始您的AI深度研究之旅！

## 💡 工作流程揭秘

当您输入一个问题后，工具内部会按以下步骤自动执行：

1.  **[分析意图]**: 您指派的“规划”AI模型会分析您的问题和AI专家角色，生成一份包含关键词、搜索策略和应使用哪个搜索引擎的JSON计划。
2.  **[执行搜索]**: 工具根据计划，并行向Tavily发送通用搜索请求，并依次向您配置的Google CSE发送专业搜索请求。
3.  **[分析结果]**: 您指派的“分析”AI模型会审查所有搜索结果的标题和摘要，筛选出1-5个最相关、信息量最丰富的来源。
4.  **[综合报告]**: 您指派的“报告生成”AI模型会接收到所有原始材料（包括搜索摘要和通过Jina Reader获取的原文），然后综合所有信息，撰写一份结构化、带引用来源的Markdown格式研究报告。

## 🛠️ 技术栈

- **核心逻辑**: Vanilla JavaScript (ES6+)
- **UI框架**: 无 (使用 `tailwindcss` 辅助样式)
- **Markdown渲染**: `marked.js`
- **API通信**: `Fetch API`

## 🤝 贡献

欢迎任何形式的贡献！如果您有好的想法、功能建议或发现了Bug，请随时提交 `Issues` 或 `Pull Requests`。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源。
