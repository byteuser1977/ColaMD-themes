# ColaMD Themes

A theme development & export toolkit for [ColaMD](https://github.com/cola-md/cola-md) — the Agent-native Markdown editor. Extract visual formatting from web pages, Word documents, and PDFs, convert them into validated CSS theme files, and export Markdown to standalone HTML or PDF with any theme applied.

## Features

### Theme Extraction

- **URL** — fetch a web page, parse its CSS rules (via `css-tree`), resolve inline styles with specificity calculation, and derive a coherent theme palette
- **DOCX** — read Word document styles (H1–H6, tables, code blocks) via mammoth, map to theme variables
- **PDF** — extract typography metadata from PDF text using multi-layer heuristic analysis
- **Auto‑detect** — `extract` command automatically routes to the right extractor

### HTML / PDF Export

- **`export-html`** — render Markdown to a standalone HTML document with theme CSS embedded, Mermaid diagrams and KaTeX math fully rendered
- **`export-pdf`** — render Markdown to PDF via Puppeteer (Chromium), preserving theme colors with `@media print` fidelity
- **`export`** — batch export multiple files or entire directories to HTML or PDF
- Powered by `@bytechain.cn/colamd/renderer` — the same Milkdown editor engine used by ColaMD itself

### Theme Management

- **`set-theme`** — configure default export theme, register custom CSS themes, switch between built-in themes
- Built-in themes: `light`, `dark`, `elegant`, `newsprint`
- Custom themes: any `.css` file registered by name, referenced in exports

### Validation & Color Systems

- **Contrast Engine** — WCAG 2.1 relative luminance & contrast ratio calculations
- **Paradigm Validator** — 15+ design constraint rules (CR, HR, SL, NT, BD, MP, FP, FS, SH) with auto-fix suggestions
- **Color System Library** — 15 predefined seed palettes across 5 families (Morandi, Macaron, Nordic, Vintage, Mint)
- **Mermaid Presets** — 3 presets (light/dark/elegant) with 20 core variables, auto-selected by luminance and accent warmth

### CSS Template Engine

Handlebars-powered template produces v3.0 paradigm CSS (≤300 lines):

| Section | Content |
|---------|---------|
| 1 | Design Tokens — seed palette (11 vars), typography (4 font stacks), font sizing, radii & spacing |
| 2 | Semantic Mapping — auto-derived from seed tokens via `var(--seed-*)` |
| 3 | Mermaid 20 Core Variables — container, font, nodes, edges, clusters, labels, titles, person, offset |
| 4 | Fine Tuning |
| 5 | Selector-Level Micro Adjustments — headings, code, pre, blockquote, table, hr, responsive |
| 6 | `@media print` — screen-mirror with `!important` + `print-color-adjust: exact` |

### AI Agent Skill

`.claude/skills/colamd-themes.skill.md` lets AI coding agents invoke the CLI directly.

## Installation

```bash
git clone git@github.com:byteuser1977/ColaMD-themes.git
cd ColaMD-themes
npm install
npm run build
```

For development with hot‑reload:

```bash
npx tsx src/cli.ts <command>
```

## Usage

### Extract a theme from a URL

```bash
colamd-themes from-url "https://example.com" --name my-theme
```

### Extract from a Word document

```bash
colamd-themes from-docx report.docx --name corporate-theme
```

### Extract from a PDF

```bash
colamd-themes from-pdf paper.pdf --name academic-theme
```

### Auto‑detect source type

```bash
colamd-themes extract source.docx --name auto-theme
```

### Validate a theme

```bash
colamd-themes validate themes/my-theme.css
```

### List themes and color systems

```bash
colamd-themes list
colamd-themes color-systems
colamd-themes mermaid-presets
```

### Export to HTML

```bash
# Single file with a built-in theme
colamd-themes export-html document.md -t elegant -o output.html

# With a custom theme
colamd-themes export-html document.md -t my-brand -o output.html
```

### Export to PDF

```bash
# Single file
colamd-themes export-pdf document.md -t dark -o output.pdf

# With page format
colamd-themes export-pdf document.md -t elegant --format Letter -o output.pdf
```

### Batch export

```bash
# Multiple files to HTML
colamd-themes export docs/*.md --format html -t light -d output/

# Directory of Markdown files to PDF
colamd-themes export docs/ --format pdf -t elegant -d output/
```

### Theme management

```bash
# Set a built-in theme as default
colamd-themes set-theme elegant --default

# Register a custom theme from a CSS file
colamd-themes set-theme my-brand --css themes/swiss-design.css

# Register and set as default
colamd-themes set-theme my-brand --css themes/swiss-design.css --default

# Unregister a custom theme
colamd-themes set-theme my-brand --remove
```

### All commands

| Command | Description |
|---------|-------------|
| `from-url <url>` | Extract theme from a web page URL |
| `from-docx <file>` | Extract theme from a .docx document |
| `from-pdf <file>` | Extract theme from a PDF document |
| `extract <source>` | Auto-detect source type and extract theme |
| `color-systems` | List 15 built-in color systems |
| `mermaid-presets` | List Mermaid presets (light/dark/elegant) |
| `list` | List all generated themes |
| `validate <file>` | Validate a theme against v3.0 paradigm rules |
| `set-theme <name>` | Set, register, or remove export themes |
| `export-html <input>` | Export Markdown → standalone HTML |
| `export-pdf <input>` | Export Markdown → PDF |
| `export <inputs...>` | Batch export multiple files or directories |

### Extract options

| Flag | Description |
|------|-------------|
| `-n, --name` | Theme name (derived from source by default) |
| `-o, --output` | Output CSS file path |
| `-d, --themes-dir` | Themes directory (default: `themes/`) |
| `-c, --color-system` | Force a color system |
| `-m, --mermaid-preset` | Force a Mermaid preset |
| `-A, --auto-match` | Auto-match color system and Mermaid preset |

### Export options

| Flag | Description |
|------|-------------|
| `-t, --theme` | Theme name (built-in, custom, or CSS file path) |
| `-o, --output` | Output file path |
| `-d, --output-dir` | Output directory for batch export |
| `--format` | Output format for batch: `html` or `pdf` (default: `html`) |
| `--format` | PDF page size: `A4`, `Letter`, `A3` (default: `A4`) |

## How It Works

### Theme Extraction Pipeline

```
Source (URL / .docx / .pdf)
    │
    ▼
┌─────────────────────┐
│  Extractor          │  Parse → raw ThemeStyle
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Color System       │  Match → 15 built-in palettes
│  Mermaid Preset     │  Select light/dark/elegant
│  Validators         │  WCAG contrast + paradigm rules
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Template Engine    │  Handlebars → v3.0 CSS (≤300 lines)
└──────────┬──────────┘
           │
           ▼
  themes/<name>.css
```

### Export Pipeline

```
Markdown file
    │
    ▼
┌─────────────────────────────────────────────┐
│  Puppeteer (headless Chromium)              │
│  ┌───────────────────────────────────────┐  │
│  │  Local HTTP Server                    │  │
│  │  serves @bytechain.cn/colamd/renderer │  │
│  │  (same-origin, no CORS)              │  │
│  └──────────────┬────────────────────────┘  │
│                 │                            │
│  createColaMDEditor({ editable: false })     │
│  applyTheme(name, customCSS?)                │
│  setMarkdown(content)                        │
│  ensureAllPluginsRendered()  ← mermaid/KaTeX │
│                 │                            │
│  ┌──────────────┴──────────────┐             │
│  │  buildExportHTML() → .html  │             │
│  │  page.pdf()        → .pdf   │             │
│  └─────────────────────────────┘             │
└─────────────────────────────────────────────┘
```

## Design Paradigm (v3.0)

Full specification: [`templates/theme-paradigm.md`](src/templates/theme-paradigm.md).

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Variable-first** | All colors, fonts, sizes, spacing as CSS custom properties. No raw values in selectors |
| **Modular** | Theme = variables + minimal selector tweaks. Built-in systems inherit automatically |
| **Semantic** | `--color-link` not `--color-blue`; `--font-heading` not `--font-sans` |
| **Derivable** | Full theme from 5 seed colors + 3 font stacks. AI agents modify only Section 1 |
| **Print-faithful** | `@media print` mirrors screen styles with `!important` + `print-color-adjust` |

### Contrast Requirements (WCAG 2.1)

| Rule ID | Level | Requirement | Threshold |
|---------|-------|-------------|-----------|
| CR-01 | MUST | Body text vs background | ≥ 7:1 (AAA) |
| CR-02 | MUST | Secondary text vs background | ≥ 4.5:1 (AA) |
| CR-03 | MUST | Dimmed text vs background | ≥ 3:1 (AA large) |
| CR-04 | MUST | Accent color vs background | ≥ 4.5:1 (AA) |
| CR-05 | SHOULD | Inline code bg vs background | ≥ 1.5:1 |

## Project Structure

```
ColaMD-themes/
├── .claude/skills/colamd-themes.skill.md   # AI agent skill
├── package.json
├── tsconfig.json
├── themes/                                  # Generated CSS themes
├── src/
│   ├── cli.ts                               # CLI entry point
│   ├── index.ts                             # Public API exports
│   ├── models.ts                            # ThemeStyle / SeedPalette types
│   ├── generator.ts                         # Handlebars → CSS pipeline
│   ├── renderer.ts                          # Puppeteer HTML/PDF export engine
│   ├── export-cli.ts                        # Export CLI commands
│   ├── theme-store.ts                       # Theme config persistence
│   ├── color-utils.ts                       # Color manipulation utilities
│   ├── contrast.ts                          # WCAG 2.1 luminance & contrast
│   ├── validators.ts                        # Paradigm validation engine
│   ├── color-systems.ts                     # 15 predefined seed palettes
│   ├── mermaid-presets.ts                   # Mermaid 20-variable presets
│   ├── docx-style-paradigm.ts              # Document style specification
│   ├── extractors/
│   │   ├── base.ts                          # Extractor interface
│   │   ├── url-extractor.ts                 # URL → ThemeStyle
│   │   ├── docx-extractor.ts                # DOCX → ThemeStyle
│   │   └── pdf-extractor.ts                 # PDF → ThemeStyle
│   └── templates/
│       ├── template.css                     # Paradigm companion CSS
│       ├── theme-paradigm.md               # v3.0 design specification
│       └── theme-template.hbs              # Handlebars CSS template
└── tests/
```

## Tech Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| Runtime | Node.js + TypeScript | ESM modules, strict typing |
| CLI framework | Commander.js | Argument parsing, subcommands |
| CSS templating | Handlebars | v3.0 paradigm CSS generation |
| HTML parsing | Cheerio | DOM traversal for URL extraction |
| CSS parsing | css-tree | CSS rule AST parsing |
| DOCX parsing | Mammoth | Word → HTML conversion |
| PDF parsing | pdf-parse | PDF text extraction |
| HTTP client | Axios | Web page fetching |
| Browser engine | Puppeteer | Headless Chromium for HTML/PDF export |
| Editor engine | @bytechain.cn/colamd | Milkdown-based Markdown renderer |
| Terminal output | Chalk + Ora | Colored text + spinners |

## License

MIT
