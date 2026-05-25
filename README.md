# ColaMD Themes

A theme development toolkit for [ColaMD](https://github.com/cola-md/cola-md) — the rich-text Markdown editor. Extract visual formatting from web pages, Word documents, and PDFs, then convert them into ColaMD-compatible CSS theme files with **WCAG-compliant contrast ratios**, **print-friendly color palettes**, and a **validated design paradigm**.

## Features

### Core Extraction

- **URL Extraction** — fetch a web page, parse its CSS rules (via `css-tree`), resolve inline styles with specificity calculation, and derive a coherent theme palette
- **DOCX Extraction** — read Word document styles (H1–H6 fonts/sizes/colors/line-heights, table headers/cells, code blocks) via mammoth, map to theme variables
- **PDF Extraction** — extract typography metadata from PDF text using multi-layer heuristic analysis (text structure → format detection → paradigm fallback)
- **Auto‑detection** — `extract` command automatically routes to the right extractor based on file type or URL scheme

### Style Paradigm Engine (`docx-style-paradigm.ts`)

The core module that defines the complete document style specification system:

| Capability | Description |
|-----------|-------------|
| **Full Typography Hierarchy** | H1–H6 headings, body text, blockquotes, inline/code blocks, tables — each with font family, size, weight, color, line-height |
| **Standard Reference Presets** | 3 built‑in presets: Academic Paper, Business Report, Technical Document — fill in any missing extracted values |
| **WCAG 2.1 Compliance** | All foreground/background pairs validated against AAA (7:1) and AA (4.5:1) contrast ratio requirements |
| **Print-Friendly Colors** | Text uses grayscale axis (HSL S ≤ 0.05) or very low saturation (S ≤ 0.15); backgrounds stay near-white/near-black neutral |
| **Chinese Typography Support** | Body line-height 1.5–1.9, heading line-height 1.25–1.4 per Chinese typesetting conventions |

### Validation & Color Systems

- **Contrast Engine** ([`contrast.ts`](src/contrast.ts)) — WCAG 2.1 relative luminance & contrast ratio calculations, HSL hue/saturation/lightness utilities
- **Paradigm Validator** ([`validators.ts`](src/validators.ts)) — 15+ design constraint rules (CR-01~06, HR-01~03, SL-01~04, AR-01~02, NT-01) with auto-fix suggestions
- **Color System Library** ([`color-systems.ts`](src/color-systems.ts)) — 12+ predefined seed palettes including Morandi (pink/green/blue), Earth tones, Ocean, Forest, Ink, and dark mode variants
- **Mermaid Presets** ([`mermaid-presets.ts`](src/mermaid-presets.ts)) — 20-variable Mermaid diagram presets for light/dark/elegant theme modes

### CSS Template Engine

Handlebars-powered template produces 24‑section ColaMD CSS:

| # | Section | Description |
|---|---------|-------------|
| 1 | `:root` variables | Typora‑compatible CSS custom properties |
| 2 | `body.theme-custom` variables | Extended ColaMD variable set |
| 3 | Mermaid variables | Diagram theme colours & fonts (60+ vars) |
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
| 23 | Print styles | `@media print` overrides (screen-mirrored + `print-color-adjust`) |
| 24 | Mobile responsive | `@media (max-width: 768px)` overrides |

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

### Extract from a URL

```bash
colamd-themes from-url "https://example.com" --name my-theme
```

The URL extractor v2.0:
- Parses `<style>` blocks via `css-tree` into structured rule maps
- Resolves CSS selectors with simplified specificity scoring
- Merges rule-level styles with inline `style` attributes
- Normalizes font sizes from `em/rem/pt/px/keyword` to px
- Detects highlight.js / Prism.js presence for code block defaults
- Infers page type (GitHub, docs site, blog) from URL + title

### Extract from a Word document

```bash
colamd-themes from-docx report.docx --name corporate-theme
```

The DOCX extractor v2.0:
- Maps Word heading styles (Heading 1–6) to H1–H6 with full style extraction
- Reads paragraph-level font runs (family, size, color, bold, italic)
- Extracts table header/cell backgrounds and border colors
- Falls back to `DocxStyleParadigm` standard reference values for missing fields
- Runs WCAG contrast validation on all extracted color pairs

### Extract from a PDF

```bash
colamd-themes from-pdf paper.pdf --name academic-theme
```

The PDF extractor v2.0:
- Uses 3-layer heuristic analysis (text structure → format detection → paradigm fallback)
- Identifies heading candidates by short lines, uppercase, numbering patterns
- Detects code blocks (monospace-like text), tables, and blockquotes
- Applies document-type-specific presets (academic/business/technical)
- Validates output against WCAG AA/AAA standards

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

## How It Works

```
Source (URL / .docx / .pdf)
    │
    ▼
┌─────────────────────┐
│  Extractor (v2.0)   │  Parse source → extract detailed element styles
│                     │  - H1-H6: font, size, weight, color, line-height
│                     │  - Body: font-family, font-size, color, bg, line-height
│                     │  - Table: header/cell bg, border, padding
│                     │  - Code/Blockquote: bg, text color, border
└──────────┬──────────┘
           │  ThemeStyle (intermediate model)
           ▼
┌─────────────────────┐
│  DocxStyleParadigm  │  Fill missing fields with standard references
│  Standard Presets   │  ACADEMIC_PAPER / BUSINESS_REPORT / TECHNICAL_DOC
│  WCAG Validator     │  Check contrast ratios, flag violations
└──────────┬──────────┘
           │  Complete ThemeStyle
           ▼
┌─────────────────────┐
│  Generator          │  Handlebars template → CSS with derived colours
│  SeedPalette        │  5 seeds → 12 semantic colors → 60+ Mermaid vars
│  Color Derivation   │  darken/lighten/opacity for hover/mark/selection
└──────────┬──────────┘
           │
           ▼
  themes/<name>.css  (24 sections, ~600 lines)
```

## Design Paradigm (v3.0)

Full specification documented in [`templates/theme-paradigm.md`](src/templates/theme-paradigm.md).

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Variable-first** | All colors, fonts, sizes, spacing defined as CSS custom properties. No raw values in selector rules |
| **Modular** | Theme files define only variables + minimal selector tweaks. Built-in systems inherit automatically |
| **Semantic** | Variable names describe purpose, not appearance: `--color-link` not `--color-blue` |
| **Derivable** | Full theme derivable from 5 seed colors + 3 font stacks. AI agents modify only Section 1 |
| **Print-faithful** | `@media print` is a mirror-enhanced copy of screen styles (same values + `!important`), not an independent design |

### Contrast Requirements (WCAG 2.1)

| Rule ID | Level | Requirement | Threshold |
|---------|-------|-------------|-----------|
| CR-01 | MUST | Body text vs background | ≥ 7:1 (AAA) |
| CR-02 | MUST | Secondary text vs background | ≥ 4.5:1 (AA) |
| CR-03 | MUST | Dimmed text vs background | ≥ 3:1 (AA large) |
| CR-04 | MUST | Accent color vs background | ≥ 4.5:1 (AA) |
| CR-05 | SHOULD | Inline code bg vs background distinction | ≥ 1.5:1 |

### Saturation Constraints (Print-Friendly)

| Rule ID | Level | Requirement |
|---------|-------|-------------|
| SL-01 | MUST | Page background saturation ≤ 0.05 (near-neutral) |
| SL-02 | MUST NOT | Large area blocks (code, blockquote) saturation > 0.10 |
| NT-01 | MUST | Ink colors on same hue axis (H deviation ≤ 3°), luminance-only variation |

## Project Structure

```
ColaMD-themes/
├── .claude/skills/colamd-themes.skill.md   # AI agent skill definition
├── package.json
├── tsconfig.json
├── themes/                                  # Generated CSS output
├── src/
│   ├── cli.ts                               # Commander.js CLI entry point
│   ├── index.ts                             # Public API exports
│   ├── models.ts                            # ThemeStyle / ColorPalette / Typography types
│   ├── color-utils.ts                       # Hex ↔ RGB, lighten, darken, mix utilities
│   ├── contrast.ts                          # WCAG 2.1 relative luminance & contrast ratio
│   ├── validators.ts                        # Paradigm validation engine (15+ rules)
│   ├── color-systems.ts                    # Predefined seed palettes (Morandi, etc.)
│   ├── mermaid-presets.ts                  # Mermaid 20-variable presets (light/dark/elegant)
│   ├── docx-style-paradigm.ts              # Core: typography hierarchy, presets, WCAG tools
│   ├── generator.ts                         # Handlebars → CSS generation pipeline
│   ├── extractors/
│   │   ├── base.ts                          # Extractor interface definition
│   │   ├── url-extractor.ts                 # v2.0: css-tree parsing, specificity, inline styles
│   │   ├── docx-extractor.ts                # v2.0: mammoth + full H1-H6/table extraction
│   │   └── pdf-extractor.ts                 # v2.0: heuristic text structure analysis
│   └── templates/
│       ├── template.css                     # Paradigm companion CSS template
│       ├── theme-paradigm.md               # v3.0 Design specification (complete rules)
│       └── theme-template.hbs              # Handlebars CSS template (~568 lines)
└── tests/
```

## Tech Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| Runtime | Node.js + TypeScript | ESM modules, strict typing |
| CLI framework | Commander.js | Argument parsing, subcommands |
| CSS templating | Handlebars | 24-section CSS generation |
| HTML parsing | Cheerio | DOM traversal for URL extraction |
| CSS parsing | css-tree | Structured CSS rule AST parsing |
| DOCX parsing | Mammoth | Word document → HTML conversion |
| PDF parsing | pdf-parse | PDF text content extraction |
| HTTP client | Axios | Web page fetching |
| Terminal output | Chalk + Ora | Colored text + spinners |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   User / AI Agent                           │
│  CLI: colamd-themes from-docx/pdf/url <source>              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      cli.ts                                 │
│              Commander.js route dispatch                    │
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
│                 docx-style-paradigm.ts                      │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────────────┐  │
│  │ Font Styles   │ │ 3 Presets  │ │ WCAG Contrast Tools   │  │
│  │ H1-H6/Body/   │ │ Academic   │ │ validateDocumentStyle │  │
│  │ Table/Code/   │ │ Business   │ │ normalizeForPrinting  │  │
│  │ Blockquote    │ │ Technical  │ │ getRecommendedPreset  │  │
│  └──────────────┘ └────────────┘ └──────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│ contrast.ts  │ │ validators.ts│ │color-systems │
│ Luminance    │ │ 15+ rules   │ │ 12+ palettes │
│ Ratio/HSL    │ │ Auto-fix    │ │ Morandi/etc  │
└──────────────┘ └─────────────┘ └──────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    generator.ts                              │
│  ┌──────────────┐ ┌─────────────────────────────────────┐  │
│  │ color-utils   │ │ Handlebars theme-template.hbs        │  │
│  │ normalize     │ │ → 24-section CSS output             │  │
│  │ derive        │ │ → 60+ Mermaid variables             │  │
│  └──────────────┘ └─────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                  themes/<name>.css
```

## License

MIT
