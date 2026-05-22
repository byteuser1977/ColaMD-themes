# ColaMD Themes

[ColaMD](https://github.com/cola-md/cola-md) 富文本 Markdown 编辑器的主题开发工具。从网页、Word 文档和 PDF 中提取视觉格式，并将其转换为 ColaMD 兼容的 CSS 主题文件。

## 功能

- **URL 提取** — 抓取网页，解析其 CSS，推导出一套协调的主题色板
- **DOCX 提取** — 读取 Word 文档样式（字体、颜色、大小），映射为主题变量
- **PDF 提取** — 从 PDF 文本中提取排版元数据
- **自动检测** — `extract` 命令自动识别来源类型并路由到对应提取器
- **CSS 模板引擎** — 基于 Handlebars 的模板，生成包含 24 个分区的完整 ColaMD CSS：
  - `:root` CSS 变量（兼容 Typora）
  - `body.theme-custom` 扩展变量集
  - Mermaid 图表主题（60+ 变量）
  - 语法高亮 token 颜色
  - ProseMirror 编辑器选择器
  - 打印样式 & 移动端响应式断点
- **AI Agent Skill** — `.claude/skills/colamd-themes.skill.md` 可供 AI 编码代理直接调用 CLI

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

### 从 Word 文档提取

```bash
colamd-themes from-docx 报告.docx --name 企业主题
```

### 从 PDF 提取

```bash
colamd-themes from-pdf 论文.pdf --name 学术主题
```

### 自动检测来源类型

```bash
colamd-themes extract 源文件.docx --name 自动主题
```

### 列出所有主题

```bash
colamd-themes list
```

### 选项

| 参数 | 说明 |
|------|------|
| `-n, --name` | 主题名称（默认从来源自动获取） |
| `-o, --output` | 自定义输出 CSS 文件路径（默认：`themes/<name>.css`） |
| `-d, --themes-dir` | 输出目录（默认：`themes/`） |

## 生成的主题结构

每个生成的 CSS 文件包含以下分区：

| # | 分区 | 说明 |
|---|------|------|
| 1 | `:root` 变量 | 兼容 Typora 的 CSS 自定义属性 |
| 2 | `body.theme-custom` 变量 | ColaMD 扩展变量集 |
| 3 | Mermaid 变量 | 图表主题颜色和字体 |
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
| 23 | 打印样式 | `@media print` 覆盖 |
| 24 | 移动端适配 | `@media (max-width: 768px)` 覆盖 |

## 工作原理

```
来源 (URL / .docx / .pdf)
    │
    ▼
┌─────────────┐
│  提取器      │  解析来源，提取颜色、字体、间距
└──────┬──────┘
       │  ThemeStyle（中间数据模型）
       ▼
┌─────────────┐
│  生成器      │  Handlebars 模板 → 包含派生颜色的完整 CSS
└──────┬──────┘
       │
       ▼
  themes/<name>.css
```

### 颜色推导机制

工具从来源中提取少量语义颜色（文本色、背景色、链接/强调色、代码背景色），然后通过算法推导其余颜色：

- **强调深色** — `darken(accent, 0.15)` 用于悬停状态
- **强调浅色** — `lighten(accent, 0.3)` 用于高亮标记
- **选区背景** — `rgba(accent, 0.18)` 用于文本选中
- **Mermaid 调色板** — 60+ 图表颜色从核心色板映射
- **语法 token** — 根据代码块背景亮度自动选择深色/浅色主题

### 启发式提取策略

每个提取器使用频率分析和选择器匹配来识别每个语义角色的最具代表性值，而非保留所有个别样式覆盖（这对全局主题没有意义）：

- **URL 提取器**：遍历 `body`、`h1`、`a`、`code`、`blockquote` 的 CSS 规则
- **DOCX 提取器**：通过 mammoth 的 HTML 转换检查段落样式
- **PDF 提取器**：分析 pdf-parse 输出的文本结构（标题 vs 正文）

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
│   ├── models.ts                            # ThemeStyle 类型定义
│   ├── color-utils.ts                       # 颜色工具函数
│   ├── generator.ts                         # Handlebars → CSS 生成管道
│   ├── extractors/
│   │   ├── base.ts                          # 提取器接口
│   │   ├── url-extractor.ts                 # URL 提取 (axios + cheerio + css-tree)
│   │   ├── docx-extractor.ts                # DOCX 提取 (mammoth)
│   │   └── pdf-extractor.ts                 # PDF 提取 (pdf-parse)
│   ├── templates/
│   │   └── theme-template.hbs               # Handlebars CSS 模板 (568 行)
│   └── types/
│       └── pdf-parse.d.ts                   # pdf-parse 类型声明
└── tests/
```

## 技术栈

| 组件 | 库 |
|------|-----|
| 运行时 | Node.js + TypeScript |
| CLI 框架 | Commander.js |
| CSS 模板 | Handlebars |
| HTML 解析 | Cheerio |
| CSS 解析 | css‑tree |
| DOCX 解析 | Mammoth |
| PDF 解析 | pdf‑parse |
| HTTP 客户端 | Axios |
| 终端输出 | Chalk + Ora |
