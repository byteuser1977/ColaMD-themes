---
name: colamd-themes
description: Generate, validate, and export ColaMD contract CSS themes with PPT slide layout support — extract from URLs, DOCX or PDF (optionally with PPT --slide-* styling), convert Markdown to slide-deck Markdown, export Markdown to HTML or PDF. Use when the user asks to create, validate, export, or manage ColaMD themes, or to generate PPT slides from Markdown.
---

Generate, validate, export, and manage ColaMD **2.7 contract** CSS themes (2.7.12 anchor + 2.7.13-rc.2 slide layouts). Extract formatting from URLs, DOCX, or PDF sources (optionally with PPT `--slide-*` styling); convert Markdown into slide-deck Markdown; export Markdown to standalone HTML/PDF with themes applied; batch export; manage theme configuration.

## Prerequisites

- Node.js ≥ 18
- Project root: run `npm install && npm run build` before first use
- Or run directly: `npx tsx src/cli.ts <command>`

## Commands

### Theme extraction

```bash
colamd-themes from-url <URL> [options]
colamd-themes from-docx <file> [options]
colamd-themes from-pdf <file> [options]
colamd-themes extract <source> [options]
```

### Export to HTML / PDF

```bash
colamd-themes export-html <input.md> -t <theme> -o <output.html>
colamd-themes export-pdf  <input.md> -t <theme> -o <output.pdf>
colamd-themes export <inputs...> --format html|pdf -t <theme> -d <dir>
```

> **Token-saving by default**: exports are optimized automatically. When the source
> markdown contains no math (`$$`, `$...$`, `\(..\)`, `\begin{..}`), the inlined
> base64 KaTeX fonts are stripped from the HTML artifact, shrinking a typical
> export from ~1.5 MB (~400k tokens) to ~57 KB (~15k tokens). Math documents keep
> their fonts automatically. Pass `--keep-fonts` on any export command to always
> embed the full fonts (e.g. formula-heavy docs that must render offline).

### Theme management

```bash
colamd-themes set-theme <name> --default
colamd-themes set-theme <name> --css <file>
colamd-themes set-theme <name> --css <file> --default
colamd-themes set-theme <name> --remove
```

### Inspection

```bash
colamd-themes color-systems [-j]
colamd-themes list [-d <dir>]
colamd-themes validate <file.css | file.md>
```

`validate` accepts theme CSS **and** slides markdown (`.md` → directive contract checks). It prints a **platform compat line** ("平台兼容") — it reports the installed `@bytechain.cn/colamd` version, whether its `themes/contract.json` matches the theme contract (2.7.12 and 2.7.13-rc.2 are both accepted), and whether the **slide layout system** is available (幻灯片版式: 支持/不支持). On drift it lists missing live variables; treat that as a signal to check the platform changelog or pin `@bytechain.cn/colamd@^2.7.12`.

## Options

### Extract options

| Flag | Description |
|------|-------------|
| `-n, --name` | Theme name |
| `-o, --output` | Output CSS file path |
| `-d, --themes-dir` | Themes directory (default: `themes/`) |
| `-c, --color-system` | Force a color system |
| `-A, --auto-match` | Auto-match a color system from the extracted palette |
| `--ppt [style]` | Also emit PPT `--slide-*` tokens (2.7.13-rc.2 slides); optional preset `serif` (default) / `sans` / `mono`. Off by default |

### Export options

| Flag | Description |
|------|-------------|
| `-t, --theme` | Theme: built-in name, custom name, or `.css` file path |
| `-o, --output` | Output file path |
| `-d, --output-dir` | Output directory for batch export |
| `--format` | Batch: `html` or `pdf`; PDF: `A4`, `Letter`, `A3` |
| `--keep-fonts` | Keep inlined base64 math fonts (default strips them when source has no math) |

## Theme Resolution

`-t, --theme` accepts:
1. **Built-in**: `light`, `dark`, `elegant`, `newsprint`
2. **Custom registered**: name set via `set-theme --css`
3. **File path**: any `.css` file on disk

Config: `~/.colamd-themes/config.json`

## Color Systems (15 schemes)

| Family | Schemes |
|--------|---------|
| 莫兰迪 (Morandi) | misty-rose, sage-green, dusky-blue |
| 马卡龙 (Macaron) | strawberry, mint, lavender |
| 北欧 (Nordic) | fjord-blue, pine-green, cloud-grey |
| 复古 (Vintage) | amber, burgundy, forest |
| 薄荷绿 (Mint) | matcha, spearmint, seafoam |

## Diagram Colors (Pele)

Mermaid 20-variable presets are gone. ColaMD 2.7.7 draws diagrams with Pele, whose SVG embeds `var(--pele-*)` and resolves them in the document. Override the 9 `--pele-*` variables on `:root` if needed; defaults derive from `--code-block-bg` / `--code-block-text` / `--link-color`.

## Workflow Examples

### Create theme from source

```bash
colamd-themes extract <source> --name "my-theme" --auto-match
```

### Export with theme

```bash
colamd-themes export-html doc.md -t elegant -o output.html
colamd-themes export-pdf doc.md -t my-brand -o output.pdf
```

### Batch export

```bash
colamd-themes export docs/ --format pdf -t dark -d output/
```

### Validate theme

```bash
colamd-themes validate themes/my-theme.css
```

## Rendering Pipeline

Export uses Puppeteer (headless Chromium) with `@bytechain.cn/colamd/renderer`:

1. Local HTTP server serves renderer ESM bundle (avoids CORS)
2. Puppeteer navigates to server page (same-origin)
3. `createColaMDEditor({ editable: false })` initializes the CM6 editor
4. Capability probe verifies the export API surface (`applyTheme` / `setMarkdown` / `ensureAllPluginsRendered` / `buildExportHTML`); drift fails fast with the installed version and a fix command
5. `applyTheme(name, customCSS?)` sets theme
6. `setMarkdown(content)` loads document
7. `ensureAllPluginsRendered()` waits for mermaid/KaTeX
8. `buildExportHTML()` → standalone HTML with embedded CSS
9. For PDF: load the export HTML in a fresh page + `page.pdf()` — do NOT `emulateMediaType('screen')`, the theme's `@media print` rules (with `print-color-adjust: exact`) must apply

## Slide Layouts (ColaMD 2.7.13-rc.2 幻灯片版式)

Upstream 2.7.13-rc.2 adds a slide deck system. A deck is plain markdown: pages split on `---`, each page may open with a header comment block.

### Directive syntax

```markdown
<!-- deck
logo: ./assets/logo.png
brand: 你的品牌
title: 报告标题
meta: 2026.11 · 汇报版
-->

---

<!-- slide: kpi
kicker: Executive Summary
label: 核心数据速览
chapter: Act I · 数据
-->

## 页标题

标题后的第一段自动成为导语。

- **数字** 说明
```

- `<!-- slide: 名字 … -->` 页头块：**仅页首生效**（该页第一个真实内容之前）；第一行是版式名 `[a-z][a-z0-9-]*`，后续行是字段 `kicker / label / chapter`。单行 `<!-- slide: cover -->` 与 `<!-- slide-kicker: … -->` 旧写法兼容。
- 页角色由 Markdown 结构决定：一页第一个标题（h1/h2 同权）是页标题，标题后第一段是导语，标题前紧邻段落兜底当 kicker。
- `<!-- slide-css h1 { … } -->` 页内 CSS 微调（白名单清洗，拒 `position: absolute/fixed`、`z-index`、伪协议）；`<!-- slide-js … -->` 页内脚本（放映沙箱执行，导出不执行）。
- deck 块配置每页 chrome：logo / brand / title / meta，文档顶部写一次。

### 11 built-in layouts

| 版式 | 内容约定 |
|---|---|
| `cover` | 首页 h1 主标题 + h2 副标题 + 首段导语 |
| `section` | 一个短标题 + 一句说明，大留白 |
| `agenda` | 有序列表 3-6 项 `**章名** 说明` |
| `kpi` | 无序列表 2-6 项 `**数字+单位** 说明` |
| `timeline` | 列表项带年份/日期 `**2019 年** 事件` |
| `steps` | 有序列表 3-5 项 `**步骤名** 说明` |
| `matrix` | 无序列表 3-8 项 `**名称** 说明` |
| `two-col` | 两个 h2 对半（左论点/右证据） |
| `figure` | 图片 / Mermaid / 表格为主体的页 |
| `quote` | 引用块为主体的页，引用后一行可作署名 |
| `closing` | 末页行动清单 |

未声明版式的页自动走默认文章版式；未知版式名无害降级。

### Markdown → PPT Markdown

```bash
colamd-themes to-slides <input.md> -o <output.md>
colamd-themes to-slides report.md --deck-brand "品牌" --deck-title "报告" --deck-meta "2026.11"
```

按内容结构自动分页并推断上述 11 种版式，生成 deck 块与页头块（kicker/chapter 随章节推进）。生成后自动跑指令契约校验。

### Slide rule validation

```bash
colamd-themes validate deck.md
```

- **SLIDES-01** (MUST_NOT)：slide 页头块出现在页首内容之后（上游会降级为普通注释）
- **SLIDES-02** (MUST_NOT)：版式名不符合 `[a-z][a-z0-9-]*`
- **SLIDES-03** (SHOULD)：未知版式名（无害降级）
- **SLIDES-04/05** (MUST_NOT)：页头块字段键 ∉ kicker/label/chapter、deck 键 ∉ logo/brand/title/meta
- **SLIDES-06** (MUST_NOT)：slide-css 含 `position: absolute/fixed`、`z-index`、伪协议 URL

### PPT style tokens (--slide-*)

Upstream `slides.css` defines ~26 `--slide-*` tokens on `:root` (title font/size/weight/tracking, kicker, chrome, page padding, KPI/quote sizes). Themes can override them — **`--ppt [style]`** emits a token section into the generated theme:

```bash
colamd-themes from-url <URL> -n my-brand --ppt sans   # presets: serif | sans | mono
```

- serif = 上游杂志衬线默认；sans = Notion 气质（无衬线、居中封面）；mono = Writer 气质（等宽标题）。品牌层只派生 `--slide-title-font` / `--slide-mono` / `--slide-title-weight`，版式字号阶梯保持上游默认。
- 自定义主题 CSS 在 slides.css 之后加载，`:root` 同权重后到先赢；不要写 `body.theme-custom`（文档契约死选择器）。
- 手写主题里的幻灯片规则须遵守：**SLIDE-01** (SHOULD) 只用已知令牌；**SLIDE-02** (MUST_NOT) `.cm-md-page-*` / `.cm-md-slide-*` / `.slide-chrome|foot|ghost` 必须包裹在 `body.presenting` 或 `body.slides-printing` 作用域下（裸写污染编辑视图）；**SLIDE-03** (SHOULD) 标题字体栈含中文字族并以 generic family 结尾。
- 平台需 ≥ 2.7.13-rc.1 才消费这些令牌（compat 行「幻灯片版式」）；旧平台下令牌惰性。导出的 HTML/PDF 仍为文档式排版，放映版式在 ColaMD 应用内查看。

## 2.7.12 Contract Constraints

- Variables live in `:root`; anything in `body.theme-*` is ignored
- Live variables only: `--bg-color --text-color --text-secondary --text-muted --border-color --link-color --code-bg --code-block-bg --code-block-text --blockquote-border --blockquote-bg --table-header-bg --selection-bg --highlight-bg --font-body --font-mono --editor-font-size --editor-column-width` + `--pele-*`
- Dead variables are rejected: `--surface-color` `--surface-alt` `--text-dim` `--heading-color` `--accent-*` `--hr-color` `--code-color` `--code-block-color` `--table-border` `--scrollbar-thumb*` `--mermaid-*` `--radius-*` `--content-width` `--font-size-root` `--font-scale-*` `--line-height-*` `--font-heading` `--font-code` `--font-mermaid`
- Editor selectors only: `#editor .cm-content` + `.cm-md-*` (CodeMirror 6 has no `<h1>` / `<blockquote>` elements)
- No vertical padding on `.cm-md-blockquote` / `.cm-md-codeblock` (one div per line)
- No `pt` units; use `px` / `em` / `rem`
- No `!important` (except `print-color-adjust` in `@media print`)
- Export DOM styling goes on `.colamd-document` (semantic tags), not `.cm-md-*`
- Generated CSS ≤ 300 lines
- Font stacks must include CJK fallback and end with generic family

## CSS Pitfall Quick Reference

> When adjusting themes, follow these rules strictly. Reference `themes/template.css` and the upstream examples in `ColaMD-extend/resources/templates/themes/`.

### 1. Root Block

**Pitfall:** Declaring variables on `body.theme-custom`. **Correct:** `:root { ... }` — the editor inherits from the document root only.

### 2. Body Text First-Line Indent

**Pitfall:** `#write p` matches nothing. **Correct:** `#editor .cm-content .cm-line { text-indent: 2em; }`, then reset `text-indent: 0` on heading / quote / code / list / rule / mermaid lines.

### 3. Indent Exclusion

**Pitfall:** Indent leaks into quotes, code and lists because every markdown line is a `.cm-line`. **Correct:** enumerate all `.cm-md-*` line classes in the reset block (template §2.5).

### 4. List Indentation

**Pitfall:** Assuming `ul/ol/li` elements exist. **Correct:** CodeMirror marks list depth with `.cm-md-li-0` … `.cm-md-li-6` on the line; style those classes, never `li::before`.

### 5. Quote / Code Block Padding

**Pitfall:** Adding `padding: 12px 16px` to `.cm-md-blockquote`. **Correct:** only `padding-left` / `padding-right` — vertical padding is applied once per line.

### 6. Pele Diagram Colors

**Pitfall:** Writing `themeVariables` or Mermaid `classDef` in the theme. **Correct:** override `--pele-*` on `:root`; the SVG reads them at render time.

## Architecture

```
Source → Extractor → ThemeStyle → Color System + Pele + Validators → CSS (2.7.12 contract)

Markdown → Puppeteer + ColaMD renderer → HTML / PDF
```

> Export runs the ColaMD 2.x library renderer (`@bytechain.cn/colamd@^2.7.12` ships `dist/lib/colamd-renderer.js` + `colamd.css`); the same CM6 editor as the app runs headless via Puppeteer. Theme CSS is consumed directly as `:root` declarations and `buildExportHTML({ title })` serializes only contract live variables. Generated CSS targets the 2.7.12 contract (unchanged since 2.7.7, machine-readable as `themes/contract.json` in the npm package), so it carries over unchanged. Platform upgrades are handled by a compat layer (`src/compat.ts`): contract drift is reported by `validate` and non-fatally at export, and the renderer API surface is probed at init — upgrades produce actionable diagnostics, not crashes.
