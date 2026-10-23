---
name: colamd-themes
description: "Generate, validate, export, and manage ColaMD 2.7 contract CSS themes."
version: 1.0.0
author: bytechain
license: MIT
metadata:
  hermes:
    tags: [colamd, themes, css, markdown, export, pdf, html]
prerequisites:
  commands: [node, npm]
---

Generate, validate, export, and manage ColaMD **2.7 contract** CSS themes. Extract formatting from URLs, DOCX, or PDF sources; export Markdown to standalone HTML/PDF with themes applied; batch export; manage theme configuration.

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
colamd-themes validate <file.css>
```

## Options

### Extract options

| Flag | Description |
|------|-------------|
| `-n, --name` | Theme name |
| `-o, --output` | Output CSS file path |
| `-d, --themes-dir` | Themes directory (default: `themes/`) |
| `-c, --color-system` | Force a color system |
| `-A, --auto-match` | Auto-match a color system from the extracted palette |

### Export options

| Flag | Description |
|------|-------------|
| `-t, --theme` | Theme: built-in name, custom name, or `.css` file path |
| `-o, --output` | Output file path |
| `-d, --output-dir` | Output directory for batch export |
| `--format` | Batch: `html` or `pdf`; PDF: `A4`, `Letter`, `A3` |

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

Mermaid 20-variable presets are gone. ColaMD 2.7 draws diagrams with Pele, whose SVG embeds `var(--pele-*)` and resolves them in the document. Override the 9 `--pele-*` variables on `:root` if needed; defaults derive from `--code-block-bg` / `--code-block-text` / `--link-color`.

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
3. `createColaMDEditor({ editable: false })` initializes Milkdown editor
4. `applyTheme(name, customCSS?)` sets theme
5. `setMarkdown(content)` loads document
6. `ensureAllPluginsRendered()` waits for mermaid/KaTeX
7. `buildExportHTML()` → standalone HTML with embedded CSS
8. For PDF: `emulateMediaType('screen')` + `page.pdf()`

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
Source → Extractor → ThemeStyle → Color System + Pele + Validators → CSS (2.7 contract)

Markdown → Puppeteer + ColaMD renderer → HTML / PDF
```

> Export still runs the 1.5.x Milkdown renderer until the upstream 2.x renderer is published; the generated CSS already targets 2.7 so it carries over unchanged.
