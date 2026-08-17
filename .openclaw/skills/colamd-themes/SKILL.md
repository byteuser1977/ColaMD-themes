---
id: colamd-themes
name: ColaMD Themes
description: >
  Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes.
  Extract from URLs/DOCX/PDF; export Markdown to HTML/PDF; batch export.
version: "1.0.0"
icon: "\U0001F3A8"
author: bytechain
homepage: https://github.com/byteuser1977/ColaMD-themes
user-invocable: true
metadata:
  openclaw:
    os: [darwin, linux, win32]
  clawdbot:
    emoji: "\U0001F3A8"
    requires:
      bins: [node, npm]
---

Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes. Extract formatting from URLs, DOCX, or PDF sources; export Markdown to standalone HTML/PDF with themes applied; batch export; manage theme configuration.

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
colamd-themes mermaid-presets [-j]
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
| `-m, --mermaid-preset` | Force a Mermaid preset (light/dark/elegant) |
| `-A, --auto-match` | Auto-match color system and Mermaid preset |

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

## Mermaid Presets

`light` — cool accent on light bg | `dark` — dark bg | `elegant` — warm accent on light bg

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

## v3.0 Paradigm Constraints

- No bare hex colors in selectors — use `var(--seed-*)`
- No bare font sizes — use `var(--font-*)`
- No Mermaid SVG selectors (handled by built-in `variables.css`)
- `!important` only in `@media print`
- Generated CSS ≤ 300 lines
- Font stacks must include CJK fallback and end with generic family

## CSS Pitfall Quick Reference

> When adjusting themes, follow these rules strictly. For each step, reference the corresponding pattern in `academic-paper.css`.

### 1. Screen & Print Must Stay in Sync

Every rule in SECTION 5 must have a mirror copy in SECTION 6 `@media print`. Reference the `SECTION 5 / SECTION 6` correspondence in `academic-paper.css`.

### 2. Body Text First-Line Indent

**Pitfall:** `#write p` does not match. **Correct:** Reference `academic-paper.css` §5.3 directly — use `body.theme-custom p, body.theme-custom #write > p`, with `margin: 0` set beforehand.

### 3. Indent Exclusion (Do Not Pollute Lists / Tables / Diagrams)

**Pitfall:** The `p` selector hits paragraphs inside all nested containers. **Correct:** Reference the exclusion block below `swiss-design.css` §5.2.1 — apply `text-indent: 0` uniformly to `li / li p / td p / th p / blockquote p / .mermaid-block p / figure p / pre p`.

### 4. List Indentation (Hardest Pitfall)

**Pitfall:** `padding-left` does not move the bullet/number; missing the `#editor .ProseMirror` editor selector; missing `li::before` and `li > p` inline conversion.

**Correct:** Reference `academic-paper.css` §5.7 directly — copy its full selector structure (`#editor .ProseMirror > ul/ol` + `#write > ul/ol:first-of-type` + `li::before` + `#editor .ProseMirror li > p`). Use `margin-left: 2em` for indentation instead of `padding-left`. For Swiss style, keep `list-style-position: outside` and do NOT change to `none`.

### 5. Mermaid CJK Text Overflow

**Pitfall:** Multi-line `<br/>` nodes have incorrect width/height calculations. **Correct:** ≤ 2 lines per node + `fontSize: 14px` + simplify text (use `·` instead of `/`, remove redundant modifiers).

### 6. Mermaid classDef Does Not Inherit themeVariables

**Pitfall:** Assuming `themeVariables` sets text color so you don't need to repeat it. **Correct:** `classDef` must explicitly declare all three properties: `fill / color / stroke`.

## Architecture

```
Source → Extractor → ThemeStyle → Color System + Mermaid Preset + Validators → CSS

Markdown → Puppeteer + ColaMD Renderer → HTML / PDF
```
