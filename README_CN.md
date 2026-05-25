# ColaMD Themes

[ColaMD](https://github.com/cola-md/cola-md) 富文本 Markdown 编辑器的主题开发工具。从网页、Word 文档和 PDF 中提取视觉格式，转换为符合 **WCAG 对比度标准**、**打印友好型配色** 和 **范式验证** 的 ColaMD 兼容 CSS 主题文件。

## 功能特性

### 核心提取能力

- **URL 提取** — 抓取网页，通过 `css-tree` 解析 CSS 规则，结合选择器特异性计算与内联样式合并，推导协调的主题色板
- **DOCX 提取** — 通过 mammoth 读取 Word 文档完整样式（H1–H6 字体/字号/颜色/行高、表头/单元格、代码块），映射为主题变量
- **PDF 提取** — 采用多层启发式分析从 PDF 文本中提取排版元数据（文本结构 → 格式检测 → 范式回退）
- **自动检测** — `extract` 命令根据文件类型或 URL 协议自动路由到对应提取器

### 样式规范引擎（[`docx-style-paradigm.ts`](src/docx-style-paradigm.ts)）

定义完整文档样式规范体系的核心模块：

| 能力 | 说明 |
|------|------|
| **完整字体层级体系** | H1–H6 标题、正文、引用块、行内/代码块、表格——每项均含字体族、字号、字重、颜色、行高 |
| **标准参考值预设** | 3 套内置预设：学术论文 / 商业报告 / 技术文档——自动填充提取缺失的字段 |
| **WCAG 2.1 合规验证** | 所有前景/背景色对均通过 AAA (7:1) 或 AA (4.5:1) 对比度校验 |
| **打印友好配色** | 文字使用灰度轴（HSL S ≤ 0.05）或极低饱和度（S ≤ 0.15）；背景保持近白/近黑中性 |
| **中文排版支持** | 正文行高 1.5–1.9，标题行高 1.25–1.4，遵循中文排版惯例 |

### 验证与色彩系统

- **对比度引擎** ([`contrast.ts`](src/contrast.ts)) — WCAG 2.1 相对亮度 & 对比度计算，HSL 色相/饱和度/明度工具函数
- **范式验证器** ([`validators.ts`](src/validators.ts)) — 15+ 条设计约束规则（CR-01~06, HR-01~03, SL-01~04, AR-01~02, NT-01），附带自动修复建议
- **色彩系统库** ([`color-systems.ts`](src/color-systems.ts)) — 12+ 套预定义种子色板，包含莫兰迪（粉/绿/蓝）、大地色系、海洋、森林、墨色及暗色模式变体
- **Mermaid 预设** ([`mermaid-presets.ts`](src/mermaid-presets.ts)) — 20 变量 Mermaid 图表预设，覆盖亮色/暗色/雅致三种主题模式

### CSS 模板引擎

基于 Handlebars 的模板引擎生成包含 24 个分区的完整 ColaMD CSS：

| # | 分区 | 说明 |
|---|------|------|
| 1 | `:root` 变量 | 兼容 Typora 的 CSS 自定义属性 |
| 2 | `body.theme-custom` 变量 | ColaMD 扩展变量集 |
| 3 | Mermaid 变量 | 图表主题颜色和字体（60+ 变量） |
| 4 | 全局样式 | `html`、`body`、`#write` 基础布局 |
| 5 | 标题 | `h1`–`h6` 字号与间距 |
| 6 | 行内元素 | `strong`、`em`、`a`、`code`、`del`、`mark`、`kbd` |
| 7 | 引用块 | 左侧强调色边框与背景 |
| 8 | 列表 | 有序、无序、任务列表复选框 |
| 9 | 代码块 | 围栏代码块，等宽字体 + 深色背景 |
| 10 | 表格 | 表头底色、交替行条纹 |
| 11 | 水平分割线 | 基于边框的分隔线 |
| 12 | 图片 | 响应式图片 + 圆角 |
| 13 | 脚注 | 弱化文字 + 顶部边框 |
| 14 | 目录 | `.md-toc` 链接样式 |
| 15 | 数学公式 | `.md-math-block` 背景色 |
| 16 | YAML 前置元数据 | `.md-meta-block` 样式 |
| 17 | 滚动条 | Webkit 自定义滚动条 |
| 18 | 选区 | `::selection` 带强调色透明度 |
| 19 | 源码模式 | CodeMirror 编辑器主题 |
| 20 | 语法高亮 | Prism/CodeMirror token 颜色 |
| 21 | Mermaid 图表 | 图表面板 & SVG 覆盖样式 |
| 22 | 序列图/流程图 | 参与者/标签样式 |
| 23 | 打印样式 | `@media print` 覆盖（屏幕镜像增强版 + `print-color-adjust`） |
| 24 | 移动端适配 | `@media (max-width: 768px)` 覆盖 |

### AI Agent Skill

`.claude/skills/colamd-themes.skill.md` 可供 AI 编码代理直接调用 CLI。

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

### 从网页提取

```bash
colamd-themes from-url "https://example.com" --name 我的主题
```

URL 提取器 v2.0 特性：
- 通过 `css-tree` 将 `<style>` 块解析为结构化规则映射
- 使用简化版特异性评分解析 CSS 选择器优先级
- 合并规则级样式与元素内联 `style` 属性
- 将 `em/rem/pt/px/关键词` 五种格式字号统一归一化为 px
- 自动检测 highlight.js / Prism.js 存在以设定代码块默认值
- 从 URL + 标题推断页面类型（GitHub / 文档站 / 博客）

### 从 Word 文档提取

```bash
colamd-themes from-docx 报告.docx --name 企业主题
```

DOCX 提取器 v2.0 特性：
- 将 Word 标题样式（Heading 1–6）映射到 H1–H6 并提取完整样式定义
- 读取段落级字体运行（font-family、size、color、bold、italic）
- 提取表格表头/单元格背景色和边框颜色
- 对缺失字段应用 `DocxStyleParadigm` 标准参考值填充
- 对所有提取的颜色对执行 WCAG 对比度验证

### 从 PDF 提取

```bash
colamd-themes from-pdf 论文.pdf --name 学术主题
```

PDF 提取器 v2.0 特性：
- 采用三层启发式分析策略（文本结构分析 → 格式特征检测 → 范式标准值回退）
- 通过短行/全大写/编号模式识别标题候选
- 检测代码块（等宽类文本）、表格、引用块等特殊元素
- 根据文档类型应用对应预设（学术/商业/技术）
- 输出结果通过 WCAG AA/AAA 标准验证

### 自动检测来源类型

```bash
colamd-themes extract 源文件.docx --name 自动主题
```

### 列出所有主题

```bash
colamd-themes list
```

### 选项参数

| 参数 | 说明 |
|------|------|
| `-n, --name` | 主题名称（默认从来源自动获取） |
| `-o, --output` | 自定义输出 CSS 文件路径（默认：`themes/<name>.css`） |
| `-d, --themes-dir` | 输出目录（默认：`themes/`） |

## 工作原理

```
来源 (URL / .docx / .pdf)
    │
    ▼
┌─────────────────────────┐
│   提取器 (v2.0)         │  解析来源 → 提取详细元素样式
│                         │  - H1-H6: 字体、字号、字重、颜色、行高
│                         │  - 正文: 字体族、字号、颜色、背景、行高
│                         │  - 表格: 表头/单元格背景、边框、内边距
│                         │  - 代码/引用块: 背景、文字色、边框
└──────────┬──────────────┘
           │  ThemeStyle（中间数据模型）
           ▼
┌─────────────────────────┐
│   DocxStyleParadigm     │  用标准参考值填充缺失字段
│   标准预设               │  ACADEMIC_PAPER / BUSINESS_REPORT / TECHNICAL_DOC
│   WCAG 验证器            │  检查对比度合规性，标记违规项
└──────────┬──────────────┘
           │  完整 ThemeStyle
           ▼
┌─────────────────────────┐
│   生成器                 │  Handlebars 模板 → 包含派生颜色的 CSS
│   SeedPalette            │  5 种子色 → 12 语义色 → 60+ Mermaid 变量
│   颜色推导                │  darken/lighten/opacity 用于悬停/标记/选区
└──────────┬──────────────┘
           │
           ▼
  themes/<name>.css  (24 个分区, ~600 行)
```

## 设计范式 (v3.0)

完整规范文档见 [`templates/theme-paradigm.md`](src/templates/theme-paradigm.md)。

### 核心设计原则

| 原则 | 说明 |
|------|------|
| **变量化优先** | 所有颜色、字体、字号、间距一律通过 CSS 自定义属性定义，选择器规则中禁止出现裸值 |
| **模块化** | 主题文件只定义变量 + 极少量选择器微调，内置系统自动继承 |
| **语义化** | 变量名描述用途而非外观：`--color-link` 而非 `--color-blue` |
| **可推导性** | 完整主题可由 5 个种子色 + 3 组字体栈自动推导，AI Agent 只需修改 Section 1 |
| **打印保真** | `@media print` 是屏幕样式的镜像增强版（同值 + `!important`），而非独立设计 |

### 对比度要求 (WCAG 2.1)

| 规则 ID | 级别 | 要求 | 阈值 |
|---------|------|------|------|
| CR-01 | 必须 | 正文色 vs 页面底色 | ≥ 7:1 (AAA) |
| CR-02 | 必须 | 次要文字 vs 页面底色 | ≥ 4.5:1 (AA) |
| CR-03 | 必须 | 弱化文字 vs 页面底色 | ≥ 3:1 (AA 大文本) |
| CR-04 | 必须 | 点缀色 vs 页面底色 | ≥ 4.5:1 (AA) |
| CR-05 | 建议 | 内联代码背景 vs 页面底色区分度 | ≥ 1.5:1 |

### 饱和度约束（打印友好）

| 规则 ID | 级别 | 要求 |
|---------|------|------|
| SL-01 | 必须 | 页面底色饱和度 ≤ 0.05（近中性，不偏色） |
| SL-02 | 禁止 | 大面积色块（代码区/引用块）饱和度 > 0.10 |
| NT-01 | 必须 | 文字色位于同一色相轴（H 偏差 ≤ 3°），仅明度变化 |

## 项目结构

```
ColaMD-themes/
├── .claude/skills/colamd-themes.skill.md   # AI Agent Skill 定义
├── package.json
├── tsconfig.json
├── themes/                                  # 生成的主题 CSS 输出目录
├── src/
│   ├── cli.ts                               # Commander.js CLI 入口
│   ├── index.ts                             # 公共 API 导出
│   ├── models.ts                            # ThemeStyle / ColorPalette / Typography 类型定义
│   ├── color-utils.ts                       # Hex ↔ RGB、lighten/darken/mix 工具函数
│   ├── contrast.ts                          # WCAG 2.1 相对亮度 & 对比度计算
│   ├── validators.ts                        # 范式验证引擎（15+ 条规则）
│   ├── color-systems.ts                    # 预定义种子色板（莫兰迪等）
│   ├── mermaid-presets.ts                  # Mermaid 20 变量预设（亮/暗/雅致）
│   ├── docx-style-paradigm.ts              # 核心：字体层级体系、预设、WCAG 工具
│   ├── generator.ts                         # Handlebars → CSS 生成管道
│   ├── extractors/
│   │   ├── base.ts                          # 提取器接口定义
│   │   ├── url-extractor.ts                 # v2.0: css-tree 解析、特异性、内联样式
│   │   ├── docx-extractor.ts                # v2.0: mammoth + 完整 H1-H6/表格提取
│   │   └── pdf-extractor.ts                 # v2.0: 启发式文本结构分析
│   └── templates/
│       ├── template.css                     # 范式配套 CSS 模板
│       ├── theme-paradigm.md               # v3.0 设计规范（完整规则集）
│       └── theme-template.hbs              # Handlebars CSS 模板（~568 行）
└── tests/
```

## 技术栈

| 组件 | 库 | 用途 |
|------|-----|------|
| 运行时 | Node.js + TypeScript | ESM 模块，严格类型 |
| CLI 框架 | Commander.js | 参数解析、子命令分发 |
| CSS 模板 | Handlebars | 24 分区 CSS 生成 |
| HTML 解析 | Cheerio | URL 提取时的 DOM 遍历 |
| CSS 解析 | css-tree | 结构化 CSS 规则 AST 解析 |
| DOCX 解析 | Mammoth | Word 文档 → HTML 转换 |
| PDF 解析 | pdf-parse | PDF 文本内容提取 |
| HTTP 客户端 | Axios | 网页抓取 |
| 终端输出 | Chalk + Ora | 彩色文本 + 加载动画 |

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户 / AI Agent                          │
│  CLI: colamd-themes from-docx/pdf/url <source>              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       cli.ts                                 │
│                Commander.js 路由分发                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
┌───────────────┐ ┌─────────────┐ ┌─────────────┐
│ url-extractor │ │docx-extract.│ │pdf-extractor│
│  (css-tree)   │ │ (mammoth)   │ │(heuristic)  │
│  v2.0         │ │  v2.0       │ │  v2.0       │
└───────┬───────┘ └──────┬──────┘ └──────┬──────┘
        │                │               │
        └────────────────┼───────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  docx-style-paradigm.ts                      │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────────────┐  │
│  │ 字体样式体系   │ │ 3 套预设    │ │ WCAG 对比度工具       │  │
│  │ H1-H6/正文/   │ │ 学术论文    │ │ validateDocumentStyle │  │
│  │ 表格/代码/    │ │ 商业报告    │ │ normalizeForPrinting  │  │
│  │ 引用块         │ │ 技术文档    │ │ getRecommendedPreset  │  │
│  └──────────────┘ └────────────┘ └──────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│ contrast.ts  │ │ validators.ts│ │color-systems │
│ 相对亮度      │ │ 15+ 规则     │ │ 12+ 色板     │
│ 对比度/HSL    │ │ 自动修复建议  │ │ 莫兰迪等     │
└──────────────┘ └─────────────┘ └──────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     generator.ts                              │
│  ┌──────────────┐ ┌─────────────────────────────────────┐  │
│  │ color-utils   │ │ Handlebars theme-template.hbs        │  │
│  │ 规范化/推导    │ │ → 24 分区 CSS 输出                   │  │
│  │               │ │ → 60+ Mermaid 变量                    │  │
│  └──────────────┘ └─────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  themes/<name>.css
```

## License

MIT
