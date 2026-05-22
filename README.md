# ColaMD Themes

A theme development toolkit for [ColaMD](https://github.com/cola-md/cola-md) — the rich-text Markdown editor. Extract visual formatting from web pages, Word documents, and PDFs, then convert it into ColaMD-compatible CSS theme files.

## Features

- **URL Extraction** — fetch a web page, parse its CSS, and derive a coherent theme palette
- **DOCX Extraction** — read Word document styles (fonts, colors, sizes) and map them to theme variables
- **PDF Extraction** — extract typography metadata from PDF text
- **Auto‑detection** — `extract` command automatically routes to the right extractor
- **CSS Template Engine** — Handlebars-powered template produces 24‑section ColaMD CSS:
  - `:root` CSS variables (Typora‑compatible)
  - `body.theme-custom` extended variable set
  - Mermaid diagram theming (60+ variables)
  - Syntax highlighting token colours
  - ProseMirror editor selectors
  - Print & mobile responsive breakpoints
- **AI Agent Skill** — `.claude/skills/colamd-themes.skill.md` lets AI coding agents invoke the CLI directly

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

### Extract from a URL

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

### List all themes

```bash
colamd-themes list
```

### Options

| Flag | Description |
|------|-------------|
| `-n, --name` | Theme name (derived from source by default) |
| `-o, --output` | Custom output CSS file path (default: `themes/<name>.css`) |
| `-d, --themes-dir` | Output directory (default: `themes/`) |

## Generated Theme Structure

Each generated CSS file includes these sections:

| # | Section | Description |
|---|---------|-------------|
| 1 | `:root` variables | Typora‑compatible CSS custom properties |
| 2 | `body.theme-custom` variables | Extended ColaMD variable set |
| 3 | Mermaid variables | Diagram theme colours & fonts |
| 4 | Global styles | `html`, `body`, `#write` base layout |
| 5 | Headings | `h1`–`h6` sizing & spacing |
| 6 | Inline elements | `strong`, `em`, `a`, `code`, `del`, `mark`, `kbd` |
| 7 | Blockquote | Left‑border accent & background |
| 8 | Lists | Ordered, unordered, task‑list checkboxes |
| 9 | Code blocks | Fenced blocks with monospace font & dark background |
| 10 | Tables | Header shading, alternating row stripes |
| 11 | Horizontal rules | Border‑based dividers |
| 12 | Images | Responsive with border‑radius |
| 13 | Footnotes | Muted text with top border |
| 14 | Table of Contents | `.md-toc` link styles |
| 15 | Math blocks | `.md-math-block` background |
| 16 | YAML frontmatter | `.md-meta-block` styling |
| 17 | Scrollbar | Webkit custom scrollbar |
| 18 | Selection | `::selection` with accent transparency |
| 19 | Source code mode | CodeMirror editor theming |
| 20 | Syntax highlighting | Prism/CodeMirror token colours |
| 21 | Mermaid diagrams | Diagram panel & SVG overrides |
| 22 | Diagrams | Sequence & flowchart actor/label styles |
| 23 | Print styles | `@media print` overrides |
| 24 | Mobile responsive | `@media (max-width: 768px)` overrides |

## How It Works

```
Source (URL / .docx / .pdf)
    │
    ▼
┌─────────────┐
│  Extractor   │  Parses source, extracts colours, fonts, spacing
└──────┬──────┘
       │  ThemeStyle (intermediate model)
       ▼
┌─────────────┐
│  Generator   │  Handlebars template → CSS with derived colours
└──────┬──────┘
       │
       ▼
  themes/<name>.css
```

### Colour Derivation

The tool extracts a handful of semantic colours from the source (text, background, link/accent, code background) and algorithmically derives the rest:

- **Accent dark** — `darken(accent, 0.15)` for hover states
- **Accent light** — `lighten(accent, 0.3)` for mark highlights
- **Selection background** — `rgba(accent, 0.18)` for text selection
- **Mermaid palette** — 60+ diagram colours mapped from the core palette
- **Syntax tokens** — dark‑theme or light‑theme defaults based on code‑block background luminance

### Heuristic Extraction Strategy

Rather than preserving every individual style override (which is meaningless for a global theme), each extractor uses frequency analysis and selector matching to identify the most representative value for each semantic role:

- **URL extractor**: walks `body`, `h1`, `a`, `code`, `blockquote` CSS rules
- **DOCX extractor**: inspects paragraph style runs via mammoth's HTML conversion
- **PDF extractor**: analyses text structure (headings vs body) from pdf‑parse output

## Project Structure

```
ColaMD-themes/
├── .claude/skills/colamd-themes.skill.md   # AI agent skill definition
├── package.json
├── tsconfig.json
├── themes/                                  # Generated CSS output
├── src/
│   ├── cli.ts                               # Commander.js CLI
│   ├── index.ts                             # Public API
│   ├── models.ts                            # ThemeStyle type definitions
│   ├── color-utils.ts                       # Colour manipulation helpers
│   ├── generator.ts                         # Handlebars → CSS pipeline
│   ├── extractors/
│   │   ├── base.ts                          # Extractor interface
│   │   ├── url-extractor.ts                 # URL extraction (axios + cheerio + css-tree)
│   │   ├── docx-extractor.ts                # DOCX extraction (mammoth)
│   │   └── pdf-extractor.ts                 # PDF extraction (pdf-parse)
│   ├── templates/
│   │   └── theme-template.hbs               # Handlebars CSS template (568 lines)
│   └── types/
│       └── pdf-parse.d.ts                   # Type declaration for pdf-parse
└── tests/
```

## Tech Stack

| Component | Library |
|-----------|---------|
| Runtime | Node.js + TypeScript |
| CLI framework | Commander.js |
| CSS templating | Handlebars |
| HTML parsing | Cheerio |
| CSS parsing | css‑tree |
| DOCX parsing | Mammoth |
| PDF parsing | pdf‑parse |
| HTTP client | Axios |
| Terminal output | Chalk + Ora |
