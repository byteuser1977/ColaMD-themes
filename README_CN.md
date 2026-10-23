# ColaMD Themes

[![DSH Skill](https://img.shields.io/badge/DSH%20Skill-supported-brightgreen?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMSAxN2gxMm0tMTItMmgxMm0tMTItMkgxMg=="/>](https://github.com/deepseek-ai/deepseek-harness)
[![Awesome DSH](https://awesome.re/badge.svg)](https://github.com/Dominic789654/awesome-deepseek-harness)
[![Awesome DSH Plugin](https://beancookie.github.io/awesome-dsh-plugin/badge.svg)](https://github.com/beancookie/awesome-dsh-plugin)

**Topics**: `dsh` `deepseek-harness` `colamd` `themes` `css` `markdown` `pdf` `html` `skill` `ai-agent`

[ColaMD](https://github.com/cola-md/cola-md) Agent 原生 Markdown 编辑器的主题开发与导出工具。从网页、Word 文档和 PDF 中提取视觉格式，转换为经过范式验证的 CSS 主题文件，并可将 Markdown 导出为带主题样式的独立 HTML 或 PDF。

## 功能特性

### 主题提取

- **URL 提取** — 抓取网页，通过 `css-tree` 解析 CSS 规则，结合选择器特异性计算与内联样式合并，推导协调的主题色板
- **DOCX 提取** — 通过 mammoth 读取 Word 文档完整样式（H1–H6、表格、代码块），映射为主题变量
- **PDF 提取** — 采用多层启发式分析从 PDF 文本中提取排版元数据
- **自动检测** — `extract` 命令根据文件类型或 URL 协议自动路由到对应提取器

### HTML / PDF 导出

- **`export-html`** — 将 Markdown 渲染为独立 HTML 文档，主题 CSS 内嵌，Mermaid 图表和 KaTeX 公式完整渲染
- **`export-pdf`** — 通过 Puppeteer（Chromium）将 Markdown 渲染为 PDF，用 `print-color-adjust: exact` 保住主题配色
- **`export`** — 批量导出多个文件或整个目录为 HTML 或 PDF
- 底层暂用 `@bytechain.cn/colamd/renderer`（1.5.x，Milkdown），等上游 2.x renderer 发布独立库构建后切换；生成的主题已按 2.7 契约编写，切换时无需改动

### 主题管理

- **`set-theme`** — 配置默认导出主题、注册自定义 CSS 主题、在内置主题间切换
- 内置主题：`light`、`dark`、`elegant`、`newsprint`
- 自定义主题：任意 `.css` 文件注册后按名称引用

### 验证与色彩系统

- **对比度引擎** — WCAG 2.1 相对亮度与对比度计算
- **范式验证器** — 15+ 条设计约束规则（CR、HR、SL、NT、BD、MP、FP、FS、SH），附带自动修复建议
- **色彩系统库** — 5 大色系 15 套预定义种子色板（莫兰迪、马卡龙、北欧、复古、薄荷绿）
- **2.7 契约校验器** — 检查死选择器（`#write`、`.ProseMirror`、`body.theme-custom`）、死变量（`--mermaid-*`、`--radius-*`、`--font-size-root` 等）、`pt` 单位与引用/代码块的纵向 padding
- **Pele 图表配色** — 9 个 `--pele-*` 变量由 `--code-block-bg` / `--code-block-text` / `--link-color` 推导，取代 Mermaid 20 变量

### 安全与性能 (v0.4.0+)

- **SSRF 防护** — URL 提取器通过协议白名单验证并阻止私有网络访问，防止服务器端请求伪造攻击
- **输入验证** — CSS 文件经过扩展名、大小限制（最大 1MB）和内容有效性验证，防止 OOM 攻击
- **异步 I/O** — 非阻塞文件操作，提升批量导出时的响应速度
- **模板缓存** — LRU 式缓存（最多 10 个模板），支持 TTL 过期（30 分钟）和基于 mtime 的自动失效，确保内存使用稳定
- **统一错误处理** — 所有命令采用结构化错误码（`CLIError` + `ErrorCode`），提供一致的调试体验
- **资源清理** — 显式 Puppeteer 页面清理，防止僵尸进程和资源泄漏

### CSS 模板引擎

基于 Handlebars 的模板引擎生成 ColaMD 2.7 契约 CSS（≤300 行）：

| 分区 | 内容 |
|------|------|
| 1 | 设计令牌 — `:root` 种子色板（11 变量）、14 个语义色、字体与度量、9 个 `--pele-*` |
| 2 | 编辑器 DOM — `#editor .cm-content` + `.cm-md-*`（标题、行内、引用、代码块、表格、缩进） |
| 3 | 导出 HTML — `.colamd-document` 语义标签配色层 |
| 4 | `@media print` — 只补打印保真（屏幕规则原样生效） |

### 多 Agent Skill 通用支持

从单一源文件自动生成 6 个 AI 编码代理的 Skill 定义：

| Agent | Skill 路径 | 前置元数据 |
|-------|-----------|-----------|
| **Claude Code** | `.claude/skills/colamd-themes.skill.md` | `name`, `description` |
| **OpenCode** | `.opencode/skills/colamd-themes/SKILL.md` | `name`, `version`, `user-invocable`, `allowed-tools`, `hooks` |
| **OpenClaw** | `.openclaw/skills/colamd-themes/SKILL.md` | `id`, `name`, `version`, `icon`, `author`, `homepage`, `metadata.openclaw.os` |
| **Hermes** | `.hermes/skills/tools/colamd-themes/SKILL.md` | `name`, `version`, `author`, `license`, `metadata.hermes.tags`, `prerequisites` |
| **Trae** | `.trae/rules/colamd-themes.md` | 纯 Markdown（无前置元数据） |
| **DeepSeek Harness** | `.dsh/skills/colamd-themes/SKILL.md` | `name`, `version`, `description`, `metadata.dsh.tags`, `prerequisites` |

**架构：**

```
skills/colamd-themes/SKILL.md       ← 规范源文件（单一事实来源）
        │
        ▼
skills/build-skills.sh              ← 构建脚本（bash）
        │
        ├──→ .claude/skills/colamd-themes.skill.md
        ├──→ .opencode/skills/colamd-themes/SKILL.md
        ├──→ .openclaw/skills/colamd-themes/SKILL.md
        ├──→ .hermes/skills/tools/colamd-themes/SKILL.md
        ├──→ .trae/rules/colamd-themes.md
        └──→ .dsh/skills/colamd-themes/SKILL.md
```

**重新生成所有 Agent 的 Skill：**

```bash
npm run build:skills            # 生成全部
bash skills/build-skills.sh     # 同上

# 或只生成单个 Agent：
bash skills/build-skills.sh claude
bash skills/build-skills.sh opencode
bash skills/build-skills.sh openclaw
bash skills/build-skills.sh hermes
bash skills/build-skills.sh trae
bash skills/build-skills.sh dsh
```

自定义 Skill 内容：编辑 `skills/colamd-themes/SKILL.md`，然后运行 `npm run build:skills`

## 安装

```bash
git clone git@github.com:byteuser1977/ColaMD-themes.git
cd ColaMD-themes
npm install
npm run build
```

开发模式（热加载）：

```bash
npx tsx src/cli.ts <command>
```

## 使用方法

本包提供两个等效的 CLI 命令：

- **`colamd-themes`** — 完整命令名
- **`cthemes`** — 短命令别名（推荐频繁使用时使用）

以下示例使用短命令 `cthemes`，你可以随时替换为 `colamd-themes`。

### 从网页提取主题

```bash
cthemes from-url "https://example.com" --name 我的主题
```

### 从 Word 文档提取

```bash
cthemes from-docx 报告.docx --name 企业主题
```

### 从 PDF 提取

```bash
cthemes from-pdf 论文.pdf --name 学术主题
```

### 自动检测来源类型

```bash
cthemes extract 源文件.docx --name 自动主题
```

### 验证主题

```bash
cthemes validate themes/我的主题.css
```

### 列出主题和色彩系统

```bash
cthemes list
cthemes color-systems
```

### 导出为 HTML

```bash
# 单文件，使用内置主题
cthemes export-html 文档.md -t elegant -o 输出.html

# 使用自定义主题
cthemes export-html 文档.md -t 我的品牌 -o 输出.html
```

### 导出为 PDF

```bash
# 单文件
cthemes export-pdf 文档.md -t dark -o 输出.pdf

# 指定页面格式
cthemes export-pdf 文档.md -t elegant --format Letter -o 输出.pdf
```

### 批量导出

```bash
# 多文件导出为 HTML
cthemes export docs/*.md --format html -t light -d 输出目录/

# 目录下所有 Markdown 导出为 PDF
cthemes export docs/ --format pdf -t elegant -d 输出目录/
```

### 主题管理

```bash
# 设置内置主题为默认
cthemes set-theme elegant --default

# 注册自定义主题
cthemes set-theme 我的品牌 --css themes/swiss-design.css

# 注册并设为默认
cthemes set-theme 我的品牌 --css themes/swiss-design.css --default

# 注销自定义主题
cthemes set-theme 我的品牌 --remove
```

### 全部命令

| 命令 | 说明 |
|------|------|
| `from-url <url>` | 从网页 URL 提取主题 |
| `from-docx <file>` | 从 .docx 文档提取主题 |
| `from-pdf <file>` | 从 PDF 文档提取主题 |
| `extract <source>` | 自动检测来源类型并提取主题 |
| `color-systems` | 列出 15 套内置色彩系统 |
| `list` | 列出所有生成的主题 |
| `validate <file>` | 验证主题是否符合 2.7 契约与范式规则 |
| `set-theme <name>` | 设置、注册或注销导出主题 |
| `export-html <input>` | 导出 Markdown → 独立 HTML |
| `export-pdf <input>` | 导出 Markdown → PDF |
| `export <inputs...>` | 批量导出多个文件或目录 |

### 提取选项

| 参数 | 说明 |
|------|------|
| `-n, --name` | 主题名称（默认从来源自动获取） |
| `-o, --output` | 输出 CSS 文件路径 |
| `-d, --themes-dir` | 主题目录（默认：`themes/`） |
| `-c, --color-system` | 强制指定色彩系统 |
| `-A, --auto-match` | 从提取的色板自动匹配色彩系统 |

### 导出选项

| 参数 | 说明 |
|------|------|
| `-t, --theme` | 主题名称（内置、自定义或 CSS 文件路径） |
| `-o, --output` | 输出文件路径 |
| `-d, --output-dir` | 批量导出的输出目录 |
| `--format` | 批量导出格式：`html` 或 `pdf`（默认：`html`） |
| `--format` | PDF 页面大小：`A4`、`Letter`、`A3`（默认：`A4`） |

## 工作原理

### 主题提取管道

```
来源 (URL / .docx / .pdf)
    │
    ▼
┌─────────────────────┐
│  提取器              │  解析来源 → 原始 ThemeStyle
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  色彩系统匹配        │  → 15 套内置色板
│  范式与契约验证      │  → WCAG 对比度 + 设计约束 + 2.7 契约
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  模板引擎            │  Handlebars → 2.7 契约 CSS（≤300 行）
└──────────┬──────────┘
           │
           ▼
  themes/<name>.css
```

### 导出管道

```
Markdown 文件
    │
    ▼
┌─────────────────────────────────────────────┐
│  Puppeteer（无头 Chromium）                  │
│  ┌───────────────────────────────────────┐  │
│  │  本地 HTTP 服务                        │  │
│  │  提供 @bytechain.cn/colamd/renderer   │  │
│  │  （同源加载，无 CORS 限制）            │  │
│  └──────────────┬────────────────────────┘  │
│                 │                            │
│  createColaMDEditor({ editable: false })     │
│  applyTheme(主题名, 自定义CSS?)              │
│  setMarkdown(内容)                           │
│  ensureAllPluginsRendered()  ← 等待渲染完成  │
│                 │                            │
│  ┌──────────────┴──────────────┐             │
│  │  buildExportHTML() → .html  │             │
│  │  page.pdf()        → .pdf   │             │
│  └─────────────────────────────┘             │
└─────────────────────────────────────────────┘
```

## 设计范式 (2.7 契约)

完整规范文档：[`templates/theme-paradigm.md`](src/templates/theme-paradigm.md)。

### 核心设计原则

| 原则 | 说明 |
|------|------|
| **变量化优先** | 所有颜色、字体、字号、间距一律通过 CSS 自定义属性定义，选择器中禁止裸值 |
| **模块化** | 主题 = 变量 + 极少量选择器微调，内置系统自动继承 |
| **语义化** | `--link-color` 而非 `--color-blue`；`--font-body` 而非 `--font-sans` |
| **可推导性** | 完整主题由 11 个种子令牌 + 3 组字体栈自动推导，AI Agent 只需修改 Section 1 |
| **打印保真** | 导出直接打印当前窗口，屏幕规则原样生效；`@media print` 只补 `print-color-adjust` |
| **无死规则** | CodeMirror 6 没有 `#write`、`.ProseMirror`、`<h1>`、`<blockquote>`，只用 `.cm-md-*` 行类 |

### 对比度要求 (WCAG 2.1)

| 规则 ID | 级别 | 要求 | 阈值 |
|---------|------|------|------|
| CR-01 | MUST | 正文色 vs 页面底色 | ≥ 7:1 (AAA) |
| CR-02 | MUST | 次要文字 vs 页面底色 | ≥ 4.5:1 (AA) |
| CR-03 | MUST | 弱化文字 vs 页面底色 | ≥ 3:1 (AA 大文本) |
| CR-04 | MUST | 点缀色 vs 页面底色 | ≥ 4.5:1 (AA) |
| CR-05 | SHOULD | 内联代码背景 vs 页面底色区分度 | ≥ 1.5:1 |

## 项目结构

```
ColaMD-themes/
├── skills/
│   ├── colamd-themes/SKILL.md              # 规范 Skill 源文件
│   └── build-skills.sh                     # 生成各 Agent 专用文件
├── .claude/skills/colamd-themes.skill.md   # Claude Code Skill
├── .opencode/skills/colamd-themes/SKILL.md # OpenCode Skill
├── .openclaw/skills/colamd-themes/SKILL.md # OpenClaw Skill
├── .hermes/skills/tools/colamd-themes/     # Hermes Skill
├── .trae/rules/colamd-themes.md           # Trae 规则
├── package.json
├── tsconfig.json
├── themes/                                  # 生成的 CSS 主题
├── src/
│   ├── cli.ts                               # CLI 入口
│   ├── index.ts                             # 公共 API 导出
│   ├── models.ts                            # ThemeStyle / SeedPalette 类型
│   ├── generator.ts                         # Handlebars → CSS 管道
│   ├── renderer.ts                          # Puppeteer HTML/PDF 导出引擎
│   ├── export-cli.ts                        # 导出 CLI 命令
│   ├── theme-store.ts                       # 主题配置持久化（异步 API）
│   ├── utils/
│   │   └── cli-utils.ts                     # 公共工具函数与错误处理
│   ├── color-utils.ts                       # 颜色操作工具
│   ├── contrast.ts                          # WCAG 2.1 亮度与对比度
│   ├── validators.ts                        # 范式验证引擎
│   ├── color-systems.ts                     # 15 套预定义种子色板
│   ├── docx-style-paradigm.ts              # 文档样式规范
│   ├── extractors/
│   │   ├── base.ts                          # 提取器接口
│   │   ├── url-extractor.ts                 # URL → ThemeStyle
│   │   ├── docx-extractor.ts                # DOCX → ThemeStyle
│   │   └── pdf-extractor.ts                 # PDF → ThemeStyle
│   └── templates/
│       ├── template.css                     # 范式配套 CSS 模板
│       ├── theme-paradigm.md               # v4.0 设计规范（2.7 契约）
│       └── theme-template.hbs              # Handlebars CSS 模板
└── tests/
```

### MCP 服务器配置

在你的 MCP 客户端配置中添加（如 Chatbox、Cursor、Claude Desktop）：

```json
{
  "mcpServers": {
    "colamd-themes": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "cwd": "/path/to/ColaMD-themes"
    }
  }
}
```

或直接运行：

```bash
npm run mcp
```

## 技术栈

| 组件 | 库 | 用途 |
|------|-----|------|
| 运行时 | Node.js + TypeScript | ESM 模块，严格类型 |
| CLI 框架 | Commander.js | 参数解析、子命令分发 |
| CSS 模板 | Handlebars | 2.7 契约 CSS 生成 |
| HTML 解析 | Cheerio | URL 提取时的 DOM 遍历 |
| CSS 解析 | css-tree | CSS 规则 AST 解析 |
| DOCX 解析 | Mammoth | Word → HTML 转换 |
| PDF 解析 | pdf-parse | PDF 文本提取 |
| HTTP 客户端 | Axios | 网页抓取 |
| 浏览器引擎 | Puppeteer | 无头 Chromium，HTML/PDF 导出 |
| 编辑器引擎 | @bytechain.cn/colamd | 基于 Milkdown 的 Markdown 渲染器 |
| 终端输出 | Chalk + Ora | 彩色文本 + 加载动画 |

## License

MIT
