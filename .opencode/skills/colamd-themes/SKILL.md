---
name: colamd-themes
version: "1.0.0"
description: >
  Generate, validate, export, and manage ColaMD 2.7 contract CSS themes
  (2.7.13 anchor, slide layouts stable). Extract from URLs/DOCX/PDF;
  one-shot ppt command: Markdown → slide deck → validated 16:9 PDF;
  document HTML/PDF export; batch export.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

Generate, validate, export, and manage ColaMD **2.7 contract** CSS themes (2.7.13 anchor, slide layouts stable). Extract formatting from URLs, DOCX, or PDF sources (optionally with PPT `--slide-*` styling); convert Markdown into slide-deck Markdown; export Markdown to standalone HTML/PDF **or a 16:9 slide PDF** with themes applied; batch export; manage theme configuration.

## Quick tasks — one command, no back-and-forth

| 任务 | 命令 |
|---|---|
| markdown → 16:9 幻灯片 PDF（含生成、校验、导出、PDF 检查） | `colamd-themes ppt report.md` |
| 只要幻灯片 markdown（不要 PDF） | `colamd-themes ppt report.md --md-only` |
| 已有 deck markdown → 16:9 PDF | `colamd-themes export-slides deck.md` |
| markdown → 文档式 HTML / PDF | `colamd-themes export-html doc.md` / `export-pdf doc.md` |
| 从 URL / DOCX / PDF / HTML 提取主题 | `colamd-themes extract <source> -n my-theme` |
| 校验主题 CSS 或 deck markdown | `colamd-themes validate <file>` |

### Invocation rules (important for agents)

1. **One command per task.** `ppt` already chains to-slides → directive/content contract → 16:9 PDF → PDF-01~05. Do not call `to-slides` + `export-slides` + `check-pdf` yourself unless the user explicitly wants the intermediate deck.
2. **Do not re-validate.** Every producing command validates internally and only reports failures; a second `validate` call costs tokens and time without adding information.
3. **Do not read the artifacts back.** Use `--json` and read the one-line result (`ok`, paths, pages, `issues`). Only open the PDF/markdown when the user asks to inspect the content.
4. **Default output is one line.** `--json` → exactly one line of JSON; `--verbose` → detail lines; failures print only the failing items (`[RULE] message`).
5. **Stop on failure.** If exit code is 1, report the failing rules plus the one-line fix hint — do not loop, retry, or re-run the same command with the same input.
6. **Themes are optional.** Omit `-t` to use the configured default theme; pass a built-in name, a registered custom name, or a `.css` path.

Exit codes: `0` success · `1` contract/validation failure or input file not found · `2` theme resolution · `3` render failure · `4` invalid input · `99` unexpected.

## Prerequisites

- Node.js ≥ 18
- Project root: run `npm install && npm run build` before first use
- Or run directly: `npx tsx src/cli.ts <command>`

## Commands

### Theme extraction

```bash
colamd-themes from-url <URL> [options]
colamd-themes from-html <file> [options]
colamd-themes from-docx <file> [options]
colamd-themes from-pdf <file> [options]
colamd-themes extract <source> [options]
```

`from-html` extracts from a **local HTML file** (v0.6.1+). A sibling
`template.json` — when present — supplies authoritative metadata: slug/tagline
as theme name/description, `typography.display/body/mono` (+ `serif_cn` /
`sans_cn`) as CJK-safe font stacks, `scheme`/`density`/`formality`/`mood` as
slide design hints. Colors come from the template's `:root` custom properties
(semantic-name matching first, luminance/saturation heuristics as fallback);
the palette is sanitized to satisfy the paradigm's luminance ordering (SL-04)
and contrast rules (CR-02). `extract` auto-detects local `.html/.htm` too.

### Export to HTML / PDF

```bash
colamd-themes export-html <input.md> -t <theme> -o <output.html>
colamd-themes export-pdf  <input.md> -t <theme> -o <output.pdf>
colamd-themes export-slides <deck.md> -t <theme> -o <output.pdf>
colamd-themes export <inputs...> --format html|pdf -t <theme> -d <dir>
```

> **`export-slides` vs `export-pdf`**: `export-slides` prints the live editor laid out as
> 16:9 sheets (deck chrome, hero centering, page breaks) and requires a deck markdown
> (with `<!-- deck ... -->` or `<!-- slide: ... -->`). `export-pdf` renders the semantic
> document DOM and produces A4/Letter/A3.
>
> Both check the produced PDF automatically. A deck export that would spill a page onto
> a second sheet is rewritten at a slightly smaller sheet type size so every declared page
> stays on exactly one sheet; `PDF-03` (pages = deck pages) must pass.

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
colamd-themes check-pdf <file.pdf> [-d <deck.md>]
```

`validate` accepts theme CSS **and** slides markdown (`.md` → directive contract checks). It prints a **platform compat line** ("平台兼容") — it reports the installed `@bytechain.cn/colamd` version, whether its `themes/contract.json` matches the theme contract (2.7.13 and 2.7.13 are both accepted), and whether the **slide layout system** is available (幻灯片版式: 支持/不支持). On drift it lists missing live variables; treat that as a signal to check the platform changelog or pin `@bytechain.cn/colamd@^2.7.13`.

## Options

### Extract options

| Flag | Description |
|------|-------------|
| `-n, --name` | Theme name |
| `-o, --output` | Output CSS file path |
| `-d, --themes-dir` | Themes directory (default: `themes/`) |
| `-c, --color-system` | Force a color system |
| `-A, --auto-match` | Auto-match a color system from the extracted palette |
| `--ppt [style]` | Also emit PPT `--slide-*` tokens (2.7.13 slides); optional preset `serif` (default) / `sans` / `mono`. Off by default. A valueless `--ppt` keeps the preset auto-detected by the extractor (from-html templates) |

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

## Slide Layouts (ColaMD 2.7.13 幻灯片版式)

Upstream 2.7.13 adds a slide deck system. A deck is plain markdown: pages split on `---`, each page may open with a header comment block.

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
| `agenda` | 有序列表 3-5 项 `**章名** 说明` |
| `kpi` | 无序列表 2-6 项 `**数字+单位** 说明` |
| `timeline` | 列表项带年份/日期 `**2019 年** 事件`，3 项 |
| `steps` | 有序列表 3-5 项 `**步骤名** 说明` |
| `matrix` | 无序列表 3-6 项 `**名称** 说明` |
| `two-col` | 两个 h2 对半（左论点/右证据） |
| `figure` | 图片 / Mermaid / 表格为主体的页 |
| `quote` | 引用块为主体的页，引用后一行可作署名 |
| `closing` | 末页行动清单，2-5 项 |

未声明版式的页自动走默认文章版式；未知版式名无害降级。

### Markdown → PPT Markdown → 16:9 PDF

```bash
# 一键：生成 deck + 校验 + 导出 16:9 PDF + PDF 内容检查
colamd-themes ppt report.md
colamd-themes ppt report.md -t elegant -d out/ --deck-brand "品牌" --deck-title "年度报告" --deck-meta "2026.11"

# 分步（需要中间产物时）
colamd-themes to-slides report.md -o report.slides.md
colamd-themes export-slides report.slides.md -t elegant
colamd-themes check-pdf report.slides.pdf -d report.slides.md
```

按内容结构自动分页并推断上述 11 种版式，生成 deck 块与页头块（kicker/chapter 随章节推进）。

**内容适配（默认开启，`--no-adapt` 关闭）**：生成时按版式契约补齐 `**行标题**`、kpi 无数字 / timeline 无日期时降级为 matrix、列表超量拆续页（`label: 标题（续）`）、超长段落按句末拆页。版式容量按 16:9 单页实测调校（timeline ≤3 项、steps/agenda ≤5 项、kpi/matrix ≤6 项、closing ≤5 项），超出即拆页而不是让导出溢出成两张纸。

导出时如果任一页在平台默认 24px 版式字号下超过单页高度，会自动按比例微调纸面字号（不低于 0.6），保证 `PDF-03`（页数 = deck 页数）通过。

### Slide rule validation

```bash
colamd-themes validate deck.md
```

- **SLIDES-01** (MUST_NOT)：slide 页头块出现在页首内容之后（上游会降级为普通注释）
- **SLIDES-02** (MUST_NOT)：版式名不符合 `[a-z][a-z0-9-]*`
- **SLIDES-03** (SHOULD)：未知版式名（无害降级）
- **SLIDES-04/05** (MUST_NOT)：页头块字段键 ∉ kicker/label/chapter、deck 键 ∉ logo/brand/title/meta
- **SLIDES-06** (MUST_NOT)：slide-css 含 `position: absolute/fixed`、`z-index`、伪协议 URL
- **SLIDES-07** (SHOULD)：版式内容不匹配——项数超出契约、缺少 `**行标题**`、kpi 无数字、timeline 无日期、figure/quote/two-col 缺少对应主体
- **SLIDES-08** (SHOULD)：估算单页内容超容量，导出时可能把一页挤出两张纸

### Export PDF content checks (PDF-01…05, v0.6.2)

导出产物的内容契约（CSS 契约管「进渲染器的」，PDF 契约管「出渲染器的」）。
`export-pdf` 每次导出后**自动执行**并打印报告；也可对任何已有 PDF 单独检查：

```bash
colamd-themes check-pdf out.pdf                    # 自动判定文档/幻灯片
colamd-themes check-pdf out.pdf -d deck.md         # 提供配对 deck → 页数/chrome 检查
```

- **PDF-01** (MUST)：PDF 可解析（pdf-parse 子进程页文本提取，≥1 页）
- **PDF-02** (MUST)：页面尺寸一致；幻灯片导出必须是 16:9 纸型
  （1280×720 @96dpi = **960×540pt**；文档式导出为 A4/Letter，仅查一致性）
- **PDF-03** (MUST)：slide 页数 = deck 页数（提供 `-d deck.md` 或 deck 指令时）——
  最常见的失真是内容溢出把一页挤出两张纸
- **PDF-04** (SHOULD)：无空白页（某页文本抽取 < 5 字符）
- **PDF-05** (SHOULD)：deck 标题（chrome）出现在 PDF 文本中（去空白比对，
  规避 Chromium 字形切分插空格）

实现要点：pdf-parse 必须跑在**干净的 `node -e` 子进程**里——pdf.js v1.10 的
worker 在 tsx/esbuild 转换环境下会确定性误报 `bad XRef entry`（对真实
Chromium 导出文件同样成立）；buffer 走 stdin，结果走 stdout JSON，
pdf-parse 的解析路径由 CLI 侧 `createRequire` 解析后经环境变量传入。
MUST 违规使命令以退出码 1 结束。

### PPT style tokens (--slide-*)

Upstream `slides.css` defines ~26 `--slide-*` tokens on `:root` (title font/size/weight/tracking, kicker, chrome, page padding, KPI/quote sizes). Themes can override them — **`--ppt [style]`** emits a token section into the generated theme:

```bash
colamd-themes from-url <URL> -n my-brand --ppt sans   # presets: serif | sans | mono
```

- serif = 上游杂志衬线默认；sans = Notion 气质（无衬线、居中封面）；mono = Writer 气质（等宽标题）。品牌层只派生 `--slide-title-font` / `--slide-mono` / `--slide-title-weight`，版式字号阶梯保持上游默认。
- **v0.6.1 全量版式令牌**：`from-html` 模板来源提供设计提示（`--sz-*` 字号阶梯 + template.json 的 mood/density/formality/scheme）时，生成 **24 个按页类型定制的令牌**——封面/章节/收页字号阶梯取自模板 display/body 比例，页标题 / KPI / 引言 / kicker / chrome / 页边距按气质（bold/quiet/tech）与密度调校；`--ppt` 不带值时信任按 display 字体自动判定的预设。无设计提示的主题保持仅品牌层输出（向后兼容）。
- 自定义主题 CSS 在 slides.css 之后加载，`:root` 同权重后到先赢；不要写 `body.theme-custom`（文档契约死选择器）。
- 手写主题里的幻灯片规则须遵守：**SLIDE-01** (SHOULD) 只用已知令牌；**SLIDE-02** (MUST_NOT) `.cm-md-page-*` / `.cm-md-slide-*` / `.slide-chrome|foot|ghost` 必须包裹在 `body.presenting` 或 `body.slides-printing` 作用域下（裸写污染编辑视图）；**SLIDE-03** (SHOULD) 标题字体栈含中文字族并以 generic family 结尾。
- 平台需 ≥ 2.7.13 才消费这些令牌（compat 行「幻灯片版式」）；旧平台下令牌惰性。文档式 `export-html` / `export-pdf` 仍是文章排版；需要真正的 16:9 幻灯片 PDF 用 `export-slides` / `ppt`（compat 行「PPT 导出」，要求 lib 暴露 `enterSlidesPrintLayout` / `exitSlidesPrintLayout`，旧平台会给出可操作的升级命令）。

## 2.7 Contract Constraints

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

## Reference-Template Refinement (page-by-page replication)

Use when the task is to reproduce a multi-page PPT template
(`beautiful-html-templates/templates/<slug>/template.html`) as a ColaMD 2.7.13
slide theme (`themes/<slug>.css`) with strict fidelity. Full methodology:
`docs/slide-theme-replication.md`. Reference themes: `themes/biennale-yellow.css`
(header / token / section-1.6 structure) and `themes/pin-and-paper.css`
(page-background layer chain).

### Workflow

1. **Read the template**: `:root` palette + fonts, then every page section's
   background / title / subtitle / body / object box (padding, radius, shadow).
2. **Map pages to layouts**: cover / section / agenda / kpi / timeline / steps /
   matrix / two-col / figure / quote / closing. A mapping supplied by the user
   always wins over your own inference; record it in the file header and §1.5.
3. **Convert**: 26px per em (presenting base `clamp(17px,1.35vw,26px)` @1920×1080);
   template px ÷ 26, taking clamp() landing points at 1920. For inline children,
   fix the li base size first, then divide by that scale.
4. **Write**: §1.5 `--slide-*` tokens (formula in every comment) → §1.6 scoped
   per-layout rules (composite selectors, SLIDE-02 scopes) → §2/§3 mirrored
   editor/export rules → §4 print.
5. **Validate**: `npx tsx src/cli.ts validate themes/<slug>.css` must report
   contract pass + slide-layout support + zero SLIDE- / SLIDES- / CSS-03
   findings. Paradigm errors are allowed only for identity items documented in
   the file header.

### Fidelity checklist (walk every page)

- **Background**: swapped-background pages need the full 5-layer chain; ordinary
  pages must not paint a page-level background.
- **Title**: family / weight / size / line-height / tracking / color / alignment /
  max-width.
- **Subtitle & kicker**: size, tracking, transform, opacity.
- **Body**: li base scale + `.cm-md-strong` row title + `.cm-md-listmark`
  number/date; redraw card borders instead of keeping capsule defaults.
- **Position**: page-level vertical centering, page padding, object-box width
  (border-box, padding included), inter-row gaps.

### Batch runs

One theme = one file, so templates can be dispatched in parallel (max 5
concurrent sub-agents). After each batch verify the file's size/mtime actually
changed — an unchanged file means a lost run, so re-dispatch it. Run `validate`
once over every theme at the end.

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

### 7. Layout class and line-role class share one div

**Pitfall:** `.cm-md-slide-quote .cm-md-blockquote` (descendant form). **Correct:** `.cm-md-slide-quote.cm-md-blockquote` — the layout class is a line decoration stamped on the same div, so upstream descendant selectors miss in the editor DOM.

### 8. Page-level vertical centering

**Pitfall:** The template centers every page (`.slide` = flex column + `justify-content:center`), while upstream only centers cover / section / closing / two-col. **Correct:** single-column layouts get `display:flex; flex-direction:column; justify-content:safe center; min-height:92vh`. Card grids (kpi / matrix / steps / timeline) must keep inline-block flow, so use `flex-wrap:wrap` + `align-content:safe center`, cards `flex:0 0 auto`, every other line `flex:0 0 100%`; also `display:none` the page directive and zero the first line's top padding.

### 9. Per-item color rotation

**Pitfall:** Painting every card with the first card's color. **Correct:** target index N with `:nth-child(2 of .cm-md-slide-kpi.cm-md-li) .cm-md-strong` (Chrome 111+); older engines fall back to the base color.

### 10. No commas inside `:nth-child(... of ...)`

**Pitfall:** `:nth-child(1 of A, B)` — the validator splits the selector at the comma and flags the second half as unscoped (SLIDE-02). **Correct:** one selector per rule, e.g. `:nth-child(1 of .cm-md-slide-section.cm-md-li)`.

### 11. Object-box width is border-box

**Pitfall:** A template `max-width:750px` already includes its 56px padding; drawing the rows at `max-width:866px` makes the box 116px too wide. **Correct:** keep the template's outer width and subtract padding from the content width — never add.

### 12. Upstream `.cm-md-li` margins

**Pitfall:** Adding `padding-block` for list gaps while upstream keeps `margin:0.45em 0` turns an 18px gap into 29px. **Correct:** zero `margin-block` first; detect first/last rows with `:has(~ .cm-md-slide-x.cm-md-li)` (not `+`) so blank lines do not break detection.

### 13. Verify before inventing

**Pitfall:** Assuming a decorative or motion layer exists on a page. **Correct:** full-text search the template first; when it is absent, say so in the header's "not replicated" note instead of inventing a layout.

## Architecture

```
Source → Extractor → ThemeStyle → Color System + Pele + Validators → CSS (2.7.13 contract)

Markdown → Puppeteer + ColaMD renderer → HTML / PDF
```

> Export runs the ColaMD 2.x library renderer (`@bytechain.cn/colamd@^2.7.13` ships `dist/lib/colamd-renderer.js` + `colamd.css`); the same CM6 editor as the app runs headless via Puppeteer. Theme CSS is consumed directly as `:root` declarations and `buildExportHTML({ title })` serializes only contract live variables. Generated CSS targets the 2.7.13 contract (unchanged since 2.7.7, machine-readable as `themes/contract.json` in the npm package), so it carries over unchanged. Platform upgrades are handled by a compat layer (`src/compat.ts`): contract drift is reported by `validate` and non-fatally at export, and the renderer API surface is probed at init — upgrades produce actionable diagnostics, not crashes.
