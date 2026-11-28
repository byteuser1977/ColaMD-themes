# ColaMD Themes

[![DSH Skill](https://img.shields.io/badge/DSH%20Skill-supported-brightgreen?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMSAxN2gxMm0tMTItMmgxMm0tMTItMkgxMg=="/>](https://github.com/deepseek-ai/deepseek-harness)
[![Awesome DSH](https://awesome.re/badge.svg)](https://github.com/Dominic789654/awesome-deepseek-harness)
[![Awesome DSH Plugin](https://beancookie.github.io/awesome-dsh-plugin/badge.svg)](https://github.com/beancookie/awesome-dsh-plugin)

**Topics**: `dsh` `deepseek-harness` `colamd` `themes` `css` `markdown` `pdf` `html` `ppt` `slides` `skill` `ai-agent`

[ColaMD](https://github.com/cola-md/cola-md) Agent 原生 Markdown 编辑器的主题开发与导出工具。从网页、Word 文档和 PDF 中提取视觉格式（可选同时生成 PPT 幻灯片样式），转换为经过范式验证的 CSS 主题文件；可将 Markdown 文档转换为幻灯片 Markdown（PPT），并可导出为带主题样式的独立 HTML 或 PDF。

## 相关项目

### ColaMD-extend — 桌面编辑器与渲染引擎

[ColaMD-extend](https://github.com/byteuser1977/ColaMD-extend) 是本工具链所使用的上游跨平台 Markdown 桌面编辑器及渲染引擎，支持 macOS、Windows 和 Linux。它提供无干扰的所见即所得编辑、文件变更实时同步、KaTeX 公式、Mermaid 图表、内置与自定义主题，以及 PDF、HTML、Word 导出能力。

使用本工具创建或校验 CSS 主题后，可在 ColaMD 中通过 **主题 → 导入主题** 导入，并在桌面编辑器中直接使用。

- [项目介绍与使用指南](https://github.com/byteuser1977/ColaMD-extend#readme)
- [官方网站](https://colamd.com/)
- [下载最新桌面版本](https://github.com/byteuser1977/ColaMD-extend/releases/latest)

### vscode-colaview — VS Code 的 ColaMD 预览扩展

[vscode-colaview](https://github.com/byteuser1977/vscode-colaview) 将 ColaMD 的渲染体验带入 VS Code。其 **ColaView MD** 扩展支持 Markdown 实时富文本预览、KaTeX 公式与 Mermaid 图表渲染、主题切换与自定义主题导入，并可导出 HTML、PDF 和 Word 文档。

安装后打开 `.md` 文件，在命令面板（`Ctrl+Shift+P`）中运行 **ColaView MD: Show Preview** 即可开启预览。本工具生成的主题可通过 **ColaView MD: Import Custom Theme...** 导入，也可放入工作区的 `.themes/` 目录使用。

- [项目介绍与安装使用指南](https://github.com/byteuser1977/vscode-colaview#readme)
- [从 Visual Studio Marketplace 安装](https://marketplace.visualstudio.com/items?itemName=bytechain.vscode-colaview)

## 功能特性

### 主题提取

- **URL 提取** — 抓取网页，通过 `css-tree` 解析 CSS 规则，结合选择器特异性计算与内联样式合并，推导协调的主题色板
- **本地 HTML 模板提取（`from-html`，v0.6.1+）** — 从本地 `.html` 文件提取主题；同目录 `template.json`（存在时）提供权威元数据（名称、tagline、字体、scheme、mood、density）。颜色取自模板 `:root` 自定义属性——语义 token 名精确匹配优先，明度/饱和度启发式兜底；调色板经清洗满足范式明度排序（SL-04）与对比度规则（CR-02）
- **DOCX 提取** — 通过 mammoth 读取 Word 文档完整样式（H1–H6、表格、代码块），映射为主题变量
- **PDF 提取** — 采用多层启发式分析从 PDF 文本中提取排版元数据
- **自动检测** — `extract` 命令根据文件类型或 URL 协议自动路由到对应提取器（本地 HTML / URL / DOCX / PDF）
- **PPT 样式（`--ppt`，v0.6.0+，默认关闭）** — 提取时可选在生成主题中追加 `--slide-*` 令牌区块（ColaMD 2.7.13 幻灯片版式）。预设对齐上游气质：`serif`（杂志衬线默认）、`sans`（Notion 风：无衬线标题、居中封面）、`mono`（Writer 风：等宽标题）。v0.6.1 起，`from-html` 按模板 display 字体自动判定预设，且当来源提供设计提示时推导**全量按页类型定制的令牌组**（24 个）：封面/章节/收页字号阶梯取自模板自身字号阶梯，页标题 / KPI / 引言 / kicker / chrome / 页边距按气质（bold/quiet/tech）、密度、正式度与明暗调校；无设计提示的主题保持仅品牌层的输出

### Markdown → PPT Markdown (v0.6.0+)

- **`to-slides`** — 将普通 Markdown 文档转换为幻灯片 Markdown：按上游分页语义切页（`---`，经 `@lezer/markdown` 解析，与应用同一解析器家族），按内容结构自动推断全部 11 种内置版式（cover / section / agenda / kpi / timeline / steps / matrix / two-col / figure / quote / closing），生成 deck 块与页头块，kicker/chapter 随章节推进
- **内容适配（v0.7.0+，默认开启；`--no-adapt` 关闭）** — 生成时按版式契约补 `**行标题**`、kpi 无数字 / timeline 无日期降级为 matrix、列表超量拆续页（`label: 标题（续）`）、超长段落按句末拆页、引用块独立成页
- **产物自校验** — 生成的 deck 在写出前自动通过指令契约（页首规则、版式名语法、字段键白名单、slide-css 安全子集）与内容契约（SLIDES-07）及溢出估算（SLIDES-08）校验
- 完整指令语法与版式对照表见 [`skills/colamd-themes/SKILL.md`](skills/colamd-themes/SKILL.md)（幻灯片版式章节）

### PPT PDF（v0.7.0+）

- **`ppt <input>`** — 一键：源 Markdown → deck Markdown → 契约校验 → **16:9 幻灯片 PDF** → PDF-01…05 内容检查；任一步失败即短路并说明原因，`--md-only` 只产出 deck
- **`export-slides <deck.md>`** — 把已有 deck 按平台幻灯片纸版式（deck chrome、hero 居中、分页）打印为 1440×810pt PDF（1920×1080 设计空间，2.8.0 起与放映同标度）；超页内容由平台整页 zoom 等比压回一页，保证 PDF 页数 = deck 页数
- 需要 `@bytechain.cn/colamd@^2.8.0` 且 lib 暴露幻灯片导出 API；旧平台会直接给出升级命令

### HTML / PDF 导出

- **`export-html`** — 将 Markdown 渲染为独立 HTML 文档，主题 CSS 内嵌，Mermaid 图表和 KaTeX 公式完整渲染
- **`export-pdf`** — 通过 Puppeteer（Chromium）将 Markdown 渲染为 PDF，用 `print-color-adjust: exact` 保住主题配色。**每次导出后自动执行内容检查（v0.6.2）**——纸型、页数、空白页与 deck chrome（PDF-01…05）；独立的 `check-pdf` 命令可检查任何已有 PDF，幻灯片导出强制 16:9 纸型（1440×810pt）与 deck 页数一致
- **`export`** — 批量导出多个文件或整个目录为 HTML、PDF，或一次同时产出两种（`--format html,pdf` 在同一次 renderer/浏览器生命周期内渲染）
- **导出产物 token 优化 (v0.5.8+，默认开启)** — 当源 Markdown 不含数学公式（`$$`、`$...$`、`\(..\)`、`\begin{..}`）时，自动剥离内嵌的 base64 KaTeX 数学字体（约占内嵌 CSS 的 96%），典型导出从 ~1.5 MB（约 40 万 tokens）压缩到 ~57 KB（约 1.5 万 tokens）——AI/LLM agent 回读导出产物时不再拖入海量字体 token。含数学的文档自动保留字体；`--keep-fonts` 可强制完整嵌入。`$1.5M` 等金额写法不会被误判为公式
- 底层使用 `@bytechain.cn/colamd/renderer`（2.x 库构建，依赖 `@bytechain.cn/colamd@^2.8.0`）——与应用同一个 CM6 编辑器经 Puppeteer 无头运行。主题 CSS 以 `:root` 声明直接消费，`buildExportHTML({ title })` 只序列化契约活变量，mermaid 图（Pele SVG）与 KaTeX 公式离线打开仍完整呈现。内置主题名优先解析本仓库的契约 CSS。生成的主题按 **2.8.0 契约**编写（变量集自 2.7.7 起未变），升级应用无需改动主题

### 主题管理

- **`set-theme`** — 配置默认导出主题、注册自定义 CSS 主题、在内置主题间切换
- 内置主题：`light`、`dark`、`elegant`、`newsprint`
- 自定义主题：任意 `.css` 文件注册后按名称引用
- **在 ColaMD 2.7.7+ 应用中使用主题** — 通过 *主题 > 导入主题* 或放入 `~/.colamd/themes/`。应用现自带内置 `elegant` 主题；导入我们的 `elegant.css` 前建议改名（如 `elegant-brick.css`）避免重名冲突

### 验证与色彩系统

- **对比度引擎** — WCAG 2.1 相对亮度与对比度计算
- **范式验证器** — 15+ 条设计约束规则（CR、HR、SL、NT、BD、MP、FP、FS、SH），附带自动修复建议
- **色彩系统库** — 5 大色系 15 套预定义种子色板（莫兰迪、马卡龙、北欧、复古、薄荷绿）
- **2.7.13 契约校验器** — 检查死选择器（`#write`、`.ProseMirror`、`body.theme-custom`）、死变量（`--mermaid-*`、`--radius-*`、`--font-size-root` 等）、`pt` 单位与引用/代码块的纵向 padding
- **幻灯片规则校验 (v0.6.0+)** — 主题侧：未知 `--slide-*` 令牌提示（SLIDE-01）、结构选择器必须包裹在 `body.presenting` / `body.slides-printing` 作用域下（SLIDE-02）、标题字体栈须含中文字族并以 generic family 结尾（SLIDE-03）；deck 侧（`validate <deck.md>`）：页头块页首规则（SLIDES-01）、版式名语法（SLIDES-02）、未知版式名提示（SLIDES-03）、字段键白名单（SLIDES-04/05）、slide-css 安全子集拒绝 `position: absolute/fixed` / `z-index` / 伪协议 URL（SLIDES-06）
- **契约核验通过** — 全部主题已对照冻结的活变量集逐项审计（契约至 2.7.13 保持不变），并在 2.7.13 导出管线上实测通过：`.cm-md-*` 钩子零漂移，`:root` 活变量与 `--pele-*` 覆盖全部被渲染器消费，导出 `:root` 恰好携带 27 个契约活变量
- **Pele 图表配色** — 9 个 `--pele-*` 变量由 `--code-block-bg` / `--code-block-text` / `--link-color` 推导，取代 Mermaid 20 变量
- **平台向后兼容 (v0.5.3+，v0.6.0 起单契约)** — [`src/compat.ts`](src/compat.ts) 运行时探测已安装 `@bytechain.cn/colamd` 的版本与 `themes/contract.json` 契约漂移（只接受 `2.7.13`——活变量/死变量集与旧锚点完全一致，主题原样携带），并探测**幻灯片版式系统**（`slidesSupported`：版本 ≥ `2.7.13-rc.1` 或 rc.2 特征 CSS）；`validate` 输出「平台兼容」报告行（含幻灯片版式支持状态），导出前校验渲染器 API 面（`applyTheme` / `setMarkdown` / `ensureAllPluginsRendered` / `buildExportHTML`）。平台升级导致的契约/API 变化给出含版本号与修复命令的明确诊断，而非渲染中途的神秘报错

### 安全与性能 (v0.4.0+)

- **SSRF 防护** — URL 提取器通过协议白名单验证并阻止私有网络访问，防止服务器端请求伪造攻击
- **输入验证** — CSS 文件经过扩展名、大小限制（最大 1MB）和内容有效性验证，防止 OOM 攻击
- **异步 I/O** — 非阻塞文件操作，提升批量导出时的响应速度
- **模板缓存** — LRU 式缓存（最多 10 个模板），支持 TTL 过期（30 分钟）和基于 mtime 的自动失效，确保内存使用稳定
- **统一错误处理** — 所有命令采用结构化错误码（`CLIError` + `ErrorCode`），提供一致的调试体验
- **资源清理** — 显式 Puppeteer 页面清理，防止僵尸进程和资源泄漏

### CSS 模板引擎

基于 Handlebars 的模板引擎生成 ColaMD 2.7.13 契约 CSS（≤300 行）：

| 分区 | 内容 |
|------|------|
| 1 | 设计令牌 — `:root` 种子色板（11 变量）、14 个语义色、字体与度量、9 个 `--pele-*` |
| 1.5 | PPT / 幻灯片（可选，`--ppt`）— `--slide-*` 令牌（2.7.13），预设气质 + 品牌字体 |
| 2 | 编辑器 DOM — `#editor .cm-content` + `.cm-md-*`（标题、行内、引用、代码块、表格、缩进） |
| 3 | 导出 HTML — `.colamd-document` 语义标签配色层 |
| 4 | `@media print` — 只补打印保真（屏幕规则原样生效） |

### 多 Agent Skill 通用支持

从单一源文件自动生成 6 个 AI 编码代理的 Skill 定义（共 7 份输出——Trae 同时生成工作区规则与项目级 Skill）：

| Agent | Skill 路径 | 前置元数据 |
|-------|-----------|-----------|
| **Claude Code** | `.claude/skills/colamd-themes.skill.md` | `name`, `description` |
| **OpenCode** | `.opencode/skills/colamd-themes/SKILL.md` | `name`, `version`, `user-invocable`, `allowed-tools`, `hooks` |
| **OpenClaw** | `.openclaw/skills/colamd-themes/SKILL.md` | `id`, `name`, `version`, `icon`, `author`, `homepage`, `metadata.openclaw.os` |
| **Hermes** | `.hermes/skills/tools/colamd-themes/SKILL.md` | `name`, `version`, `author`, `license`, `metadata.hermes.tags`, `prerequisites` |
| **Trae（规则）** | `.trae/rules/colamd-themes.md` | 纯 Markdown（无前置元数据） |
| **Trae（Skill）** | `.trae/skills/colamd-themes/SKILL.md` | `name`, `description`（单行 plain scalar） |
| **DeepSeek Harness** | `.dsh/skills/colamd-themes/SKILL.md` | `name`, `version`, `description`, `metadata.dsh.tags`, `prerequisites` |

**架构：**

```
skills/colamd-themes/SKILL.md       ← 规范源文件（单一事实来源）
        │
        ▼
skills/build-skills.js              ← 跨平台启动器（透传给 bash）
        │
        ├──→ .claude/skills/colamd-themes.skill.md
        ├──→ .opencode/skills/colamd-themes/SKILL.md
        ├──→ .openclaw/skills/colamd-themes/SKILL.md
        ├──→ .hermes/skills/tools/colamd-themes/SKILL.md
        ├──→ .trae/rules/colamd-themes.md
        ├──→ .trae/skills/colamd-themes/SKILL.md
        └──→ .dsh/skills/colamd-themes/SKILL.md
```

**重新生成所有 Agent 的 Skill：**

```bash
npm run build:skills            # 生成全部（跨平台，PATH 无 bash 也可用）

# 或只生成单个 Agent：
npm run build:skills -- claude
npm run build:skills -- opencode
npm run build:skills -- openclaw
npm run build:skills -- hermes
npm run build:skills -- trae
npm run build:skills -- trae-skill
npm run build:skills -- dsh
```

自定义 Skill 内容：编辑 `skills/colamd-themes/SKILL.md`，然后运行 `npm run build:skills`

### DSH 插件 (dsh-market)

本包同时是可从 dsh-market 安装的 **DSH（DeepSeek Harness）插件 bundle**。装入 DSH Profile 后同时提供三类能力：

1. **Agent skill** — 捆绑的 `colamd-themes` skill（主题提取 / 校验 / 幻灯片 / 导出），注册到 Harness `skills` 服务
2. **UI 集成** — 输入框主题胶囊、侧边栏预览页签、Markdown 就地渲染（含幻灯片模式）、文件导出与全屏演示窗口
3. **CLI 命令** — `colamd-themes` / `cthemes`，安装后 Profile 内 Agent 可直接调用

从 DSH Profile 安装（npm 发布后）：在 dsh-market 界面添加 `@bytechain.cn/colamd-themes`，或执行 `dsh plugin --profile <name> add @bytechain.cn/colamd-themes`。

#### 架构

| 组成 | 文件 | 职责 |
|------|------|------|
| 插件契约 | [`cordis.patch.yml`](cordis.patch.yml) | `package.json` 声明 `dsh.bundle.patch`，向 Profile 组合树插入 `colamd-themes` Cordis Entry |
| 宿主入口 | [`src/dsh-plugin.ts`](src/dsh-plugin.ts) | 导出 Cordis 协议（`name` / `inject: ["skills", "webServer"]` / `apply`）。经 `ctx.skills.registerProvider` 把捆绑的 `skills/colamd-themes/SKILL.md` 注册到 Harness `skills` 服务（与内置 dsh-ppt 插件同一 provider 协议），并在 Harness `webServer` 服务上挂载下表六条 HTTP 路由。某个服务不可用时只告警——skill 注册与 CLI 命令照常生效 |
| 客户端入口 | [`client/client.js`](client/client.js) | 手写的客户端 bundle（`package.json` 的 `dsh.client`，无需构建，只依赖 React）。占三个席位：输入框工具行的主题胶囊（`conversation.input.left`）、侧边栏 `colamd-themes-preview` 页签（`sidebar.right.pane.tab`）、文档标题栏胶囊（`sidebar.right.tab.document` / `sidebar.right.tab.document.action`） |
| 主题目录 | [`src/dsh-theme-catalog.ts`](src/dsh-theme-catalog.ts) | 解析 `themes/*.css` 的头注释与 `:root` 种子色，产出目录条目（标题 / 副标题 / 明暗 / 色温 / 令牌）；15 秒 TTL 缓存 + 并发合并——一张坏样式表不会拖垮整个目录 |
| 预览渲染 | [`src/dsh-preview.ts`](src/dsh-preview.ts) | 自带 Markdown→HTML 渲染器，外加独立文档模板、shadow 片段渲染与幻灯片渲染。预览运行时不需要 `@bytechain.cn/colamd`，主题 CSS 完整隔离在 iframe / shadow root 内，不污染应用 DOM |
| 导出写入 | [`src/dsh-export.ts`](src/dsh-export.ts) · [`src/dsh-office.ts`](src/dsh-office.ts) · [`src/dsh-zip.ts`](src/dsh-zip.ts) | puppeteer 打印 PDF + 零依赖 OOXML 构造器——`buildDocx` / `buildPptx` 跑在 STORE 压缩包写入器上（CRC32、UTF-8 文件名标志、时间戳固定保证可复现） |

#### 界面功能

- **选主题** — 输入框工具行的 **主题** 胶囊点开是全部主题的卡片网格，每张缩略图都用该主题自己的种子色绘制，深浅与色温一眼可辨；面板带搜索框与「全部 / 浅色 / 深色 / 暖调 / 冷调」分组，选卡即写入选择，侧边栏预览立刻重渲染
- **侧边栏预览** — `colamd-themes-preview` 页签用 iframe 承载所选主题的示例文档，支持 ‹ › 逐主题切换、窄栏 / 宽栏与重新加载；选择变化时经 `v=` 时间戳强制刷新
- **Markdown 就地渲染** — 右侧边栏打开 Markdown（`md` / `markdown` / `mdx`）时，渲染器下拉里可选「ColaMD 主题」（渲染器 id `@bytechain.cn/colamd-themes/document`，注册在 `documentPreviews`）。正文由宿主 `POST /render` 渲染成主题片段挂进 shadow root：`renderThemeFragment` 把主题的 `:root` 改成 `:host`、把独立文档的 `body` 层压平，主题样式既不外泄也不需要导出 HTML 或另开浏览器。文档标题栏的主题胶囊点开是与输入框同一套「搜索 + 分类分组」面板，选中后正文就地重渲染，并与托盘胶囊、侧边栏预览页签保持同步
- **幻灯片模式** — 「文稿 / 幻灯片」胶囊把预览切到上游 ColaMD-extend 的 deck 契约：`---` 分页，页首可写 `<!-- slide: <layout>` 多行块（带 `kicker:` / `label:` / `chapter:` 字段），deck 级用 `<!-- deck-brand: … -->` 一类指令。十一种版式（`cover / section / agenda / kpi / timeline / steps / matrix / two-col / figure / quote / closing`）按上游 `slides.css` 排版——kicker 在标题上、标题后第一段为导语、页眉品牌 + hairline、页脚品牌与页码。尺寸按页宽 `cqw` 缩放，可用主题的 `--slide-*` 令牌覆盖；内容超重时自动续页，内联脚本再按溢出逐级缩放
- **导出** — 「导出」胶囊按当前模式给选项，并且一律打印「页面上那一版 CSS」，不做二次实现：
  - 幻灯片模式：**幻灯片 PDF（16:9）**——一页一张、960×540pt，打印前在 print 媒体下重跑一次自适应缩放；以及 **幻灯片 PPT（.pptx）**
  - 文稿模式：**文档 PDF（A4）** 与 **Word（.docx）**
  - PPTX 由零依赖 OOXML 构造器写成显式文本框（kicker、accent 标题、正文、要点、可选代码框），可继续编辑，但只是**尽力还原**——PowerPoint 的文本框位置固定、不随页面缩放，`--slide-*` 令牌、分栏与 hairline 不会 1:1 重现，要「与页面一模一样」请用幻灯片 PDF。`format=pptx` 只在 `mode=slides` 下接受（文稿模式返回 400 `bad-format`）
  - PDF 由宿主侧 puppeteer 打印（切 print 媒体 + 等 `document.fonts.ready` + 页面零边距、逐页克隆 `15mm 14mm` 内边距、`--page-bg` 铺满整页）
- **全屏演示** — 「全屏」胶囊（以及预览页签上的独立按钮）打开真正的独立窗口，不在侧边栏里挤。Electron 外壳只放行指向 `http://127.0.0.1|localhost` 的弹窗，因此演示页由宿主渲染并用一次性地址交付。幻灯片支持 `←/→`、空格翻页，`Home`/`End` 跳页，`F` 切全屏，左右半屏点击也能翻页；文稿模式是居中的 920px 单栏

#### HTTP API

全部路由以 `exact` 方式挂在 Harness `webServer` 服务的 `/api/bytechain/colamd-themes` 前缀下。写接口只接受同源请求（校验 `sec-fetch-site` / `origin`，其余返回 403 `untrusted-origin`）。

| 路由 | 方法 | 用途 |
|------|------|------|
| `/catalog` | GET | 主题目录 + 当前选择 |
| `/preview` | GET `?theme=&mode=&width=` | 独立预览 HTML（20 秒 mtime 缓存；width 320–1600） |
| `/render` | POST `{markdown, theme?, mode?}` ≤4 MiB | 供 shadow DOM 挂载的主题片段；theme 缺省或无效时回落当前选择 |
| `/selection` | GET / POST `{theme}` | 读 / 写 UI 选择——持久化到 `~/.colamd-themes/dsh-ui.json`，按目录校验（未知 id 回退 `elegant`） |
| `/export` | POST `{format, mode?, markdown, theme?, title?}` | 二进制下载（`pdf` / `docx` / `pptx`）；文件名经 RFC 5987 `content-disposition` 回传；缺 Chromium 时返回 503 并附可操作提示 |
| `/present` | GET `?token=` · GET `?theme=&mode=` · POST | 全屏交付：POST 把渲染结果按 UUID token 存入内存（10 分钟 TTL、最多 24 份）并返回 `{ ok, url }`；无 token 的 GET 按当前主题现渲染示例稿给预览页签 |

#### 兼容性

- **运行时 peer** — `@deepseek-ai/dsh-skill` 声明为 *optional* peer（`^0.2.0-rc || ^0.2.1-rc || … || ^0.2.9-rc`，semver 预发布规则要求每个 rc 补丁位单独枚举，现已覆盖 0.2.x 全部小版本 rc（0.2.0～0.2.9），后续 0.2 小版本 rc 无需再改；0.1.x 与 0.3+ 宿主线不在支持范围内）：market 按 DSH 运行时版本校验，独立 `npm install` 不受影响
- **向后兼容** — 运行时只消费 dsh-skill 的稳定常量 `BUNDLED_SKILL_RANK`，宿主入口 `apply()` 对 skills 服务协议漂移容错（降级为警告，不阻塞 Profile 加载）
- **平台兼容层** — [`src/compat.ts`](src/compat.ts) 运行时探测已安装 `@bytechain.cn/colamd` 的版本与 `themes/contract.json` 契约漂移，渲染器初始化时校验导出 API 面；平台升级导致的契约/API 变化在 `cthemes validate` 与导出阶段给出明确诊断，而非神秘报错
- **Bundle 内容** — `dist/`（CLI + 宿主入口 + 预览/幻灯片渲染器 + OOXML 写入器）、`client/`（客户端 bundle）、`themes/`（58 个契约 CSS 主题文件，全部通过 `validate`）、`skills/`（捆绑 skill）、`cordis.patch.yml`

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

### 从本地 HTML 模板提取（v0.6.1+）

```bash
# 同目录 template.json（名称/tagline/字体/scheme/mood）存在时自动采用
cthemes from-html templates/vellum/template.html -n vellum --ppt -o themes/vellum.css

# 批量：逐个提取目录下全部模板（--ppt 不带值时信任按模板 display 字体自动判定的预设）
Get-ChildItem templates -Directory | ForEach-Object {
  cthemes from-html "$($_.FullName)\template.html" -n $_.Name --ppt -o "themes/$($_.Name).css"
}
```

### 提取时附带 PPT 幻灯片样式（可选，默认关闭）

```bash
# 同时生成 --slide-* 令牌，sans 预设（serif | sans | mono）
cthemes from-url "https://example.com" --name 我的品牌 --ppt sans

# --ppt 不带预设：保留提取器自动判定的预设（from-html 模板）
cthemes from-html template.html --ppt
```

### 将 Markdown 转换为幻灯片 Markdown（PPT）

```bash
# 一键：deck Markdown + 校验 + 16:9 PDF（推荐）
cthemes ppt 报告.md -t elegant

# 只产出 deck Markdown
cthemes ppt 报告.md --md-only

# 分步：deck → PDF
cthemes to-slides 报告.md -o 报告.slides.md
cthemes export-slides 报告.slides.md -t elegant -o 报告.slides.pdf
```

### 转换为幻灯片 Markdown

```bash
# 自动推断全部 11 种版式 + deck 块，产物自动校验
cthemes to-slides 报告.md -o 报告.slides.md

# 保持原文不改写
cthemes to-slides 报告.md --no-adapt

# 指定 deck 页脚信息
cthemes to-slides 报告.md --deck-brand "ColaMD" --deck-title "季度汇报" --deck-meta "2026.11"

# 校验生成的（或手写的）deck 是否符合指令契约
cthemes validate 报告.slides.md
```

### 自动检测来源类型

```bash
cthemes extract 源文件.docx --name 自动主题
```

### 验证主题（或幻灯片 deck）

```bash
# 主题 CSS：2.7 契约 + 范式规则 + 幻灯片令牌规则
cthemes validate themes/我的主题.css

# 幻灯片 Markdown：指令契约校验（页首规则、版式名、字段键、slide-css 安全子集）
cthemes validate 报告.slides.md
```

有意保留的设计身份偏差（纸底饱和度、低于文字对比阈值的装饰色）可在主题文件里
机器可读地声明，让 `validate` 在批量/CI 中保持通过，同时仍在 `waived` 中如实报告：

```css
/* colamd-allow: SL-01, CR-04 */
```

仅 `SL-` / `CR-` / `NT-` 身份族可豁免；契约类规则（`CSS-*`、`SLIDE-*`、`SLIDES-*`）
永不接受豁免，真实的对比度问题必须通过加深文字色解决，而不是列进白名单。

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

# 一次同时产出两种格式（共享渲染器/浏览器启动）
cthemes export docs/ --format html,pdf -t elegant -d 输出目录/
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
| `from-html <file>` | 从本地 HTML 文件提取主题（同目录 `template.json` 存在时作为元数据来源） |
| `from-pdf <file>` | 从 PDF 文档提取主题 |
| `extract <source>` | 自动检测来源类型（本地 HTML / URL / .docx / .pdf）并提取主题 |
| `to-slides <input>` | 将 Markdown 文档转换为幻灯片 Markdown（自动推断版式） |
| `ppt <input>` | 一键：deck Markdown + 校验后的 16:9 幻灯片 PDF（含 PDF-01…05 检查） |
| `export-slides <input>` | 将 deck Markdown 导出为 16:9 幻灯片 PDF（1440×810pt） |
| `color-systems` | 列出 15 套内置色彩系统 |
| `list` | 列出所有生成的主题 |
| `validate <file>` | 验证主题 CSS（2.8 契约 + 范式 + 幻灯片令牌规则）或幻灯片 Markdown 文件（指令契约）；含平台兼容报告 |
| `check-pdf <file>` | 导出 PDF 内容检查：纸型、页数、空白页、deck chrome（PDF-01…05）；`-d <deck.md>` 启用 slide 一致性检查 |
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
| `--ppt [style]` | 同时生成 PPT `--slide-*` 令牌（2.7.13 幻灯片版式）；可选预设 `serif`（默认）/ `sans` / `mono`。默认关闭。`--ppt` 不带值时保留提取器自动判定的预设（from-html 模板） |

### to-slides 选项

| 参数 | 说明 |
|------|------|
| `-o, --output` | 输出 `.md` 路径（默认：`<input>.slides.md`） |
| `--deck-brand` | deck 页脚品牌（左下衬线文字） |
| `--deck-title` | deck 页脚标题（覆盖 frontmatter / 首个 h1） |
| `--deck-meta` | deck 页脚元信息（右上兜底，如日期） |
| `--deck-logo` | deck 页脚 logo 路径（相对输出文件） |
| `--no-adapt` | 保持原文不改写（默认按版式契约适配） |

### ppt 选项

| 参数 | 说明 |
|------|------|
| `-t, --theme` | 主题名（内置、自定义或 CSS 路径） |
| `-d, --output-dir` | 输出目录（默认与输入同目录） |
| `--deck-brand/-title/-meta/-logo` | deck 页脚字段 |
| `--no-adapt` | 保持原文不改写 |
| `--md-only` | 只产出 deck Markdown（跳过 PDF） |
| `--json` / `--verbose` | 单行 JSON 结果 / 明细行 |

### 导出选项

| 参数 | 说明 |
|------|------|
| `-t, --theme` | 主题名称（内置、自定义或 CSS 文件路径） |
| `-o, --output` | 输出文件路径 |
| `-d, --output-dir` | 批量导出的输出目录 |
| `--format` | 批量导出格式：`html`、`pdf` 或逗号分隔组合如 `html,pdf`（默认：`html`） |
| `--format` | PDF 页面大小：`A4`、`Letter`、`A3`（默认：`A4`） |
| `--keep-fonts` | 保留内嵌 base64 数学字体（默认在源文档无公式时剥离） |

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
│  范式与契约验证      │  → WCAG 对比度 + 设计约束 + 2.7.13 契约
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  模板引擎            │  Handlebars → 2.7.13 契约 CSS（≤300 行）
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
│  │  buildExportHTML({title}) → .html │       │
│  │  page.pdf()        → .pdf   │             │
│  └─────────────────────────────┘             │
└─────────────────────────────────────────────┘
```

## 设计范式 (2.7.13 契约)

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
│   └── build-skills.js                     # 跨平台启动器（生成各 Agent 专用文件）
├── .claude/skills/colamd-themes.skill.md   # Claude Code Skill
├── .opencode/skills/colamd-themes/SKILL.md # OpenCode Skill
├── .openclaw/skills/colamd-themes/SKILL.md # OpenClaw Skill
├── .hermes/skills/tools/colamd-themes/     # Hermes Skill
├── .trae/rules/colamd-themes.md           # Trae 规则
├── .trae/skills/colamd-themes/            # Trae 项目级 Skill
├── cordis.patch.yml                        # DSH 插件 bundle patch（dsh-market）
├── client/
│   └── client.js                           # DSH 客户端 bundle：输入框主题胶囊 + 侧边栏预览
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
│   ├── dsh-plugin.ts                        # DSH 宿主入口（skill provider + UI HTTP 路由）
│   ├── dsh-theme-catalog.ts                 # themes/*.css → 主题目录条目（标题/明暗/色温/令牌）
│   ├── dsh-preview.ts                       # 自带 Markdown → 独立预览文档渲染
│   ├── compat.ts                            # 平台兼容层（双契约 + 幻灯片探测 + 渲染器 API 探测）
│   ├── slides.ts                            # PPT --slide-* 令牌、预设与品牌派生（2.7.13）
│   ├── slides-markdown.ts                   # Markdown → 幻灯片 Markdown 转换 + 指令契约校验
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
│       ├── theme-paradigm.md               # v4.0 设计规范（2.7.13 契约）
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
| CSS 模板 | Handlebars | 2.7.13 契约 CSS 生成 |
| HTML 解析 | Cheerio | URL 提取时的 DOM 遍历 |
| CSS 解析 | css-tree | CSS 规则 AST 解析 |
| DOCX 解析 | Mammoth | Word → HTML 转换 |
| PDF 解析 | pdf-parse | PDF 文本提取 |
| HTTP 客户端 | Axios | 网页抓取 |
| 浏览器引擎 | Puppeteer | 无头 Chromium，HTML/PDF 导出 |
| 编辑器引擎 | @bytechain.cn/colamd | 基于 CM6 的 Markdown 渲染器（2.7.13 锚点 + 2.7.13 幻灯片版式） |
| 幻灯片解析 | @lezer/markdown | Markdown → 幻灯片 Markdown 转换（与上游同一解析器家族） |
| 终端输出 | Chalk + Ora | 彩色文本 + 加载动画 |

## License

MIT
