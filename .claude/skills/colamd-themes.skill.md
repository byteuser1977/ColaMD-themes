---
name: colamd-themes
description: >
  Generate, validate, export, and manage ColaMD v3.0 paradigm CSS themes.
  Extract formatting from URLs, DOCX, or PDF sources; export Markdown to
  standalone HTML/PDF with themes applied; batch export; manage theme
  configuration. Use when the user wants to create, modify, validate,
  export, or list ColaMD themes.
---

# ColaMD Themes — v3.0 Theme Engine + Export

## Architecture

```
Source (URL/DOCX/PDF)  ──→  Extractor  ──→  ThemeStyle
                                              │
                    ┌─────────────────────────┘
                    ▼
         Color System + Mermaid Preset + Validators
                    │
                    ▼
         Handlebars Template → themes/<name>.css

Markdown file  ──→  ColaMD Renderer (Puppeteer)  ──→  HTML / PDF
```

## All Commands

### Theme extraction

```bash
colamd-themes from-url <URL> [options]       # Extract from web page
colamd-themes from-docx <file> [options]     # Extract from Word document
colamd-themes from-pdf <file> [options]      # Extract from PDF
colamd-themes extract <source> [options]     # Auto-detect source type
```

### Export to HTML / PDF

```bash
colamd-themes export-html <input.md> -t <theme> -o <output.html>
colamd-themes export-pdf  <input.md> -t <theme> -o <output.pdf>
colamd-themes export <inputs...> --format html|pdf -t <theme> -d <dir>
```

### Theme management

```bash
colamd-themes set-theme <name> --default          # Set built-in as default
colamd-themes set-theme <name> --css <file>       # Register custom theme
colamd-themes set-theme <name> --css <file> --default  # Register + set default
colamd-themes set-theme <name> --remove           # Unregister custom theme
```

### Inspection

```bash
colamd-themes color-systems [-j]      # List 15 color systems (optionally JSON)
colamd-themes mermaid-presets [-j]    # List 3 Mermaid presets
colamd-themes list [-d <dir>]         # List generated theme CSS files
colamd-themes validate <file.css>     # Validate against v3.0 paradigm rules
```

## Options

### Extract options (from-url, from-docx, from-pdf, extract)

| Flag | Description |
|------|-------------|
| `-n, --name` | Theme name |
| `-o, --output` | Output CSS file path |
| `-d, --themes-dir` | Themes directory (default: `themes/`) |
| `-c, --color-system` | Force a color system (`color-systems` to list) |
| `-m, --mermaid-preset` | Force a Mermaid preset (light/dark/elegant) |
| `-A, --auto-match` | Auto-match color system and Mermaid preset |

### Export options (export-html, export-pdf, export)

| Flag | Description |
|------|-------------|
| `-t, --theme` | Theme name — built-in, custom, or path to `.css` file |
| `-o, --output` | Output file path (single file export) |
| `-d, --output-dir` | Output directory (batch export, default: `.`) |
| `--format` | Batch format: `html` or `pdf` (default: `html`) |
| `--format` | PDF page size: `A4`, `Letter`, `A3` (default: `A4`) |

## Theme Resolution

The `-t, --theme` flag accepts:
1. **Built-in theme**: `light`, `dark`, `elegant`, `newsprint`
2. **Registered custom theme**: a name previously registered via `set-theme --css`
3. **CSS file path**: any `.css` file on disk (auto-detected by `existsSync`)

Config stored at `~/.colamd-themes/config.json`.

## Color Systems (15 schemes)

| Family | Schemes | Style |
|--------|---------|-------|
| 莫兰迪 (Morandi) | misty-rose, sage-green, dusky-blue | Low saturation, muted |
| 马卡龙 (Macaron) | strawberry, mint, lavender | High brightness, pastel |
| 北欧 (Nordic) | fjord-blue, pine-green, cloud-grey | Clean, minimal |
| 复古 (Vintage) | amber, burgundy, forest | Warm, rich |
| 薄荷绿 (Mint) | matcha, spearmint, seafoam | Fresh, modern |

## Mermaid Presets (3 presets)

| Preset | When selected |
|--------|--------------|
| `light` | Cool accent on light bg |
| `dark` | Dark background themes |
| `elegant` | Warm accent on light bg |

## AI Agent Workflow

### Create a theme from a source

```bash
colamd-themes extract <source> --name "my-theme" --auto-match
```

### Export with a theme

```bash
colamd-themes export-html doc.md -t elegant -o output.html
colamd-themes export-pdf doc.md -t my-brand -o output.pdf
```

### Batch export a directory

```bash
colamd-themes export docs/ --format pdf -t dark -d output/
```

### Modify a theme

Edit only SECTION 1 variables in the CSS file (`--seed-*`, `--font-*`), then validate:

```bash
colamd-themes validate themes/my-theme.css
```

## Rendering Pipeline

Export commands use Puppeteer (headless Chromium) with `@bytechain.cn/colamd/renderer`:

1. A local HTTP server serves the renderer ESM bundle (avoids CORS)
2. Puppeteer navigates to the server page (same-origin)
3. `createColaMDEditor({ editable: false })` initializes the Milkdown editor
4. `applyTheme(name, customCSS?)` sets the visual theme
5. `setMarkdown(content)` loads the document
6. `ensureAllPluginsRendered()` waits for mermaid SVGs and KaTeX math
7. `buildExportHTML()` produces a standalone HTML with embedded CSS
8. For PDF: the HTML is loaded in a fresh page, `emulateMediaType('screen')` preserves colors, `page.pdf()` generates the file

## Output Structure

Exported HTML contains:
- Embedded CSS variables and theme styles
- Plugin CSS (Mermaid, Math)
- Custom theme CSS (if applicable)
- `@media print` rules from the theme
- Fully rendered Mermaid SVGs and KaTeX HTML

## Prerequisites

- Node.js ≥ 18
- Run from project root: `/Volumes/DATA/data/develop/git/ColaMD-themes`
- Install: `npm install` (includes `@bytechain.cn/colamd` and `puppeteer`)
- Build: `npm run build`
- Or run directly: `npx tsx src/cli.ts <command>`

## Paradigm Constraints

- No bare hex colors in selectors — always `var(--seed-*)`
- No bare font sizes — always `var(--font-*)`
- No Mermaid SVG selectors (handled by built-in `variables.css`)
- `!important` only in `@media print`
- Generated CSS ≤ 300 lines
- Font stacks must include CJK fallback and end with generic family
