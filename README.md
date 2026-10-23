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
- **`export-pdf`** — render Markdown to PDF via Puppeteer (Chromium); theme colors are preserved with `print-color-adjust: exact`
- **`export`** — batch export multiple files or entire directories to HTML or PDF
- Powered by `@bytechain.cn/colamd/renderer` (1.5.x, Milkdown) until the upstream 2.x renderer publishes a standalone library build. Generated themes already target the 2.7 contract, so they carry over unchanged.

### Theme Management

- **`set-theme`** — configure default export theme, register custom CSS themes, switch between built-in themes
- Built-in themes: `light`, `dark`, `elegant`, `newsprint`
- Custom themes: any `.css` file registered by name, referenced in exports

### Validation & Color Systems

- **Contrast Engine** — WCAG 2.1 relative luminance & contrast ratio calculations
- **Paradigm Validator** — 15+ design constraint rules (CR, HR, SL, NT, BD, MP, FP, FS, SH) with auto-fix suggestions
- **Color System Library** — 15 predefined seed palettes across 5 families (Morandi, Macaron, Nordic, Vintage, Mint)
- **2.7 CSS Contract Validator** — flags dead selectors (`#write`, `.ProseMirror`, `body.theme-custom`), dead variables (`--mermaid-*`, `--radius-*`, `--font-size-root`…), `pt` units, and vertical padding on quote/code lines
- **Pele Diagram Colors** — 9 `--pele-*` variables derived from `--code-block-bg` / `--code-block-text` / `--link-color`, replacing the 20 Mermaid variables

### Security & Performance (v0.3.2+)

- **SSRF Protection** — URL extractor validates against protocol whitelist and blocks private network access to prevent Server-Side Request Forgery attacks
- **Input Validation** — CSS files validated for extension, size limit (1MB max), and content validity to prevent OOM attacks
- **Async I/O** — Non-blocking file operations for improved responsiveness during batch exports
- **Template Caching** — LRU-style cache (max 10 templates) with TTL expiration (30min) and mtime-based auto-invalidation for stable memory usage
- **Unified Error Handling** — Structured error codes (`CLIError` + `ErrorCode`) across all commands for consistent debugging experience
- **Resource Cleanup** — Explicit Puppeteer page cleanup prevents zombie processes and resource leaks

### CSS Template Engine

Handlebars-powered template produces ColaMD 2.7 contract CSS (≤300 lines):

| Section | Content |
|---------|---------|
| 1 | Design Tokens — `:root` seed palette (11 vars), 14 semantic colors, fonts, metrics, 9 `--pele-*` |
| 2 | Editor DOM — `#editor .cm-content` + `.cm-md-*` (headings, inline, quote, code block, table, indent) |
| 3 | Exported HTML — `.colamd-document` color layer for semantic tags |
| 4 | `@media print` — print-color fidelity only (screen rules already apply) |

### Multi-Agent Skill

Universal skill definitions for 5 AI coding agents, auto-generated from a single source:

| Agent | Skill Path | Frontmatter |
|-------|-----------|-------------|
| **Claude Code** | `.claude/skills/colamd-themes.skill.md` | `name`, `description` |
| **OpenCode** | `.opencode/skills/colamd-themes/SKILL.md` | `name`, `version`, `user-invocable`, `allowed-tools`, `hooks` |
| **OpenClaw** | `.openclaw/skills/colamd-themes/SKILL.md` | `id`, `name`, `version`, `icon`, `author`, `homepage`, `metadata.openclaw.os` |
| **Hermes** | `.hermes/skills/tools/colamd-themes/SKILL.md` | `name`, `version`, `author`, `license`, `metadata.hermes.tags`, `prerequisites` |
| **Trae** | `.trae/rules/colamd-themes.md` | Plain Markdown (no frontmatter) |

**Architecture:**

```
skills/colamd-themes/SKILL.md       ← Canonical source (single source of truth)
        │
        ▼
skills/build-skills.sh              ← Build script (bash)
        │
        ├──→ .claude/skills/colamd-themes.skill.md
        ├──→ .opencode/skills/colamd-themes/SKILL.md
        ├──→ .openclaw/skills/colamd-themes/SKILL.md
        ├──→ .hermes/skills/tools/colamd-themes/SKILL.md
        └──→ .trae/rules/colamd-themes.md
```

**Regenerate all agent skills:**

```bash
npm run build:skills            # generate all
bash skills/build-skills.sh     # same thing

# Or generate for a single agent:
bash skills/build-skills.sh claude
bash skills/build-skills.sh opencode
bash skills/build-skills.sh openclaw
bash skills/build-skills.sh hermes
bash skills/build-skills.sh trae
```

To customize: edit `skills/colamd-themes/SKILL.md`, then run `npm run build:skills`.

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

The package provides two equivalent CLI commands:

- **`colamd-themes`** — full command name
- **`cthemes`** — short alias (recommended for frequent use)

Examples below use the short alias `cthemes`, but you can substitute `colamd-themes` interchangeably.

### Extract a theme from a URL

```bash
cthemes from-url "https://example.com" --name my-theme
```

### Extract from a Word document

```bash
cthemes from-docx report.docx --name corporate-theme
```

### Extract from a PDF

```bash
cthemes from-pdf paper.pdf --name academic-theme
```

### Auto‑detect source type

```bash
cthemes extract source.docx --name auto-theme
```

### Validate a theme

```bash
cthemes validate themes/my-theme.css
```

### List themes and color systems

```bash
cthemes list
cthemes color-systems
```

### Export to HTML

```bash
# Single file with a built-in theme
cthemes export-html document.md -t elegant -o output.html

# With a custom theme
cthemes export-html document.md -t my-brand -o output.html
```

### Export to PDF

```bash
# Single file
cthemes export-pdf document.md -t dark -o output.pdf

# With page format
cthemes export-pdf document.md -t elegant --format Letter -o output.pdf
```

### Batch export

```bash
# Multiple files to HTML
cthemes export docs/*.md --format html -t light -d output/

# Directory of Markdown files to PDF
cthemes export docs/ --format pdf -t elegant -d output/
```

### Theme management

```bash
# Set a built-in theme as default
cthemes set-theme elegant --default

# Register a custom theme from a CSS file
cthemes set-theme my-brand --css themes/swiss-design.css

# Register and set as default
cthemes set-theme my-brand --css themes/swiss-design.css --default

# Unregister a custom theme
cthemes set-theme my-brand --remove
```

### All commands

| Command | Description |
|---------|-------------|
| `from-url <url>` | Extract theme from a web page URL |
| `from-docx <file>` | Extract theme from a .docx document |
| `from-pdf <file>` | Extract theme from a PDF document |
| `extract <source>` | Auto-detect source type and extract theme |
| `color-systems` | List 15 built-in color systems |
| `list` | List all generated themes |
| `validate <file>` | Validate a theme against the 2.7 contract and paradigm rules |
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
| `-A, --auto-match` | Auto-match a color system from the extracted palette |

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
│  Validators         │  WCAG contrast + paradigm + 2.7 contract
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Template Engine    │  Handlebars → 2.7 CSS (≤300 lines)
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

## Design Paradigm (2.7 contract)

Full specification: [`templates/theme-paradigm.md`](src/templates/theme-paradigm.md).

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Variable-first** | All colors, fonts, sizes, spacing as CSS custom properties. No raw values in selectors |
| **Modular** | Theme = variables + minimal selector tweaks. Built-in systems inherit automatically |
| **Semantic** | `--link-color` not `--color-blue`; `--font-body` not `--font-sans` |
| **Derivable** | Full theme from 11 seed tokens + 3 font stacks. AI agents modify only Section 1 |
| **Print-faithful** | Export prints the current window, so screen rules apply as-is; `@media print` only adds `print-color-adjust` |
| **No dead rules** | CodeMirror 6 has no `#write`, `.ProseMirror`, `<h1>` or `<blockquote>` elements — only `.cm-md-*` line classes |

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
├── skills/
│   ├── colamd-themes/SKILL.md              # Canonical skill source
│   └── build-skills.sh                     # Generate agent-specific files
├── .claude/skills/colamd-themes.skill.md   # Claude Code skill
├── .opencode/skills/colamd-themes/SKILL.md # OpenCode skill
├── .openclaw/skills/colamd-themes/SKILL.md # OpenClaw skill
├── .hermes/skills/tools/colamd-themes/     # Hermes skill
├── .trae/rules/colamd-themes.md           # Trae rules
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
│   ├── theme-store.ts                       # Theme config persistence (async API)
│   ├── utils/
│   │   └── cli-utils.ts                     # Shared utilities & error handling
│   ├── color-utils.ts                       # Color manipulation utilities
│   ├── contrast.ts                          # WCAG 2.1 luminance & contrast
│   ├── validators.ts                        # Paradigm validation engine
│   ├── color-systems.ts                     # 15 predefined seed palettes
│   ├── docx-style-paradigm.ts              # Document style specification
│   ├── extractors/
│   │   ├── base.ts                          # Extractor interface
│   │   ├── url-extractor.ts                 # URL → ThemeStyle
│   │   ├── docx-extractor.ts                # DOCX → ThemeStyle
│   │   └── pdf-extractor.ts                 # PDF → ThemeStyle
│   └── templates/
│       ├── template.css                     # Paradigm companion CSS
│       ├── theme-paradigm.md               # v4.0 design specification (2.7 contract)
│       └── theme-template.hbs              # Handlebars CSS template
└── tests/
```

## Tech Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| Runtime | Node.js + TypeScript | ESM modules, strict typing |
| CLI framework | Commander.js | Argument parsing, subcommands |
| CSS templating | Handlebars | 2.7 contract CSS generation |
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
