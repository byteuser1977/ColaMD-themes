# ColaMD Themes

[![DSH Skill](https://img.shields.io/badge/DSH%20Skill-supported-brightgreen?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNOSAxNi4yIDQuOCAxMmwtMS40IDEuNEw5IDE5IDIxIDdsLTEuNC0xLjR6Ii8%2BPC9zdmc%2B)](https://github.com/deepseek-ai/deepseek-harness)
[![Awesome DSH](https://img.shields.io/badge/Awesome-DSH-black)](https://github.com/Dominic789654/awesome-deepseek-harness)
[![Awesome DSH Plugin](https://beancookie.github.io/awesome-dsh-plugin/badge.svg)](https://github.com/beancookie/awesome-dsh-plugin)

**Topics**: `dsh` `deepseek-harness` `colamd` `themes` `css` `markdown` `pdf` `html` `skill` `ai-agent`

A theme development & export toolkit for [ColaMD](https://github.com/cola-md/cola-md) — the Agent-native Markdown editor. Extract visual formatting from web pages, Word documents, and PDFs, convert them into validated CSS theme files, and export Markdown to standalone HTML or PDF with any theme applied.

## Related Projects

### ColaMD-extend — Desktop Editor & Rendering Engine

[ColaMD-extend](https://github.com/byteuser1977/ColaMD-extend) is the upstream cross-platform Markdown desktop editor and rendering engine used by this toolkit. It offers distraction-free WYSIWYG editing, live file synchronization, KaTeX math, Mermaid diagrams, built-in and custom themes, and PDF/HTML/Word export on macOS, Windows, and Linux.

Create or validate a CSS theme with this toolkit, then import it into ColaMD through **Theme → Import Theme** to use it in the desktop editor.

- [Project introduction & usage guide](https://github.com/byteuser1977/ColaMD-extend#readme)
- [Official website](https://colamd.com/)
- [Download the latest desktop release](https://github.com/byteuser1977/ColaMD-extend/releases/latest)

### vscode-colaview — ColaMD Preview for VS Code

[vscode-colaview](https://github.com/byteuser1977/vscode-colaview) brings the ColaMD rendering experience to VS Code. The **ColaView MD** extension provides live rich Markdown preview, KaTeX and Mermaid rendering, theme switching and custom theme imports, plus HTML, PDF, and Word export.

After installation, open a `.md` file and run **ColaView MD: Show Preview** from the Command Palette (`Ctrl+Shift+P`). Themes generated here can be imported with **ColaView MD: Import Custom Theme...** or placed in the workspace `.themes/` directory.

- [Project introduction & setup guide](https://github.com/byteuser1977/vscode-colaview#readme)
- [Install from Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=bytechain.vscode-colaview)

## Features

### Theme Extraction

- **URL** — fetch a web page, parse its CSS rules (via `css-tree`), resolve inline styles with specificity calculation, and derive a coherent theme palette
- **DOCX** — read Word document styles (H1–H6, tables, code blocks) via mammoth, map to theme variables
- **PDF** — extract typography metadata from PDF text using multi-layer heuristic analysis
- **Auto‑detect** — `extract` command automatically routes to the right extractor

### HTML / PDF Export

- **`export-html`** — render Markdown to a standalone HTML document with theme CSS embedded, Mermaid diagrams and KaTeX math fully rendered
- **`export-pdf`** — render Markdown to PDF via Puppeteer (Chromium); theme colors are preserved with `print-color-adjust: exact`
- **`export`** — batch export multiple files or entire directories to HTML, PDF, or both at once (`--format html,pdf` renders both artifacts in a single renderer/browser lifecycle)
- **Token-saving exports (v0.5.8+, default on)** — when the source markdown contains no math (`$$`, `$...$`, `\(..\)`, `\begin{..}`), the inlined base64 KaTeX math fonts (≈96% of the embedded CSS) are stripped from the export artifact, shrinking a typical export from ~1.5 MB (~400k tokens) to ~57 KB (~15k tokens) — ideal when an AI/LLM agent reads the output back. Math documents keep their fonts automatically; `--keep-fonts` forces full font embedding. Money mentions like `$1.5M` are correctly ignored by the math detector
- Powered by `@bytechain.cn/colamd/renderer` (2.x library build, requires `@bytechain.cn/colamd@^2.7.12`) — the same CM6 editor as the app runs headless via Puppeteer. Theme CSS is consumed directly as `:root` declarations, `buildExportHTML({ title })` serializes only contract live variables, and mermaid diagrams (Pele SVG) / KaTeX math stay fully rendered offline. Built-in theme names resolve their local contract CSS first. Generated themes target the **2.7.12 contract**, so they carry over unchanged.

### Theme Management

- **`set-theme`** — configure default export theme, register custom CSS themes, switch between built-in themes
- Built-in themes: `light`, `dark`, `elegant`, `newsprint`
- Custom themes: any `.css` file registered by name, referenced in exports
- **Using themes in the ColaMD 2.7.7+ app** — import via *Theme > Import Theme* or drop the `.css` into `~/.colamd/themes/`. The app ships its own built-in `elegant`; rename our `elegant.css` (e.g. `elegant-brick.css`) before importing to avoid a name clash.

### Validation & Color Systems

- **Contrast Engine** — WCAG 2.1 relative luminance & contrast ratio calculations
- **Paradigm Validator** — 15+ design constraint rules (CR, HR, SL, NT, BD, MP, FP, FS, SH) with auto-fix suggestions
- **Color System Library** — 15 predefined seed palettes across 5 families (Morandi, Macaron, Nordic, Vintage, Mint)
- **2.7.12 CSS Contract Validator** — flags dead selectors (`#write`, `.ProseMirror`, `body.theme-custom`), dead variables (`--mermaid-*`, `--radius-*`, `--font-size-root`…), `pt` units, and vertical padding on quote/code lines
- **Contract verified** — all 16 shipped themes audited against the frozen live-variable set (contract unchanged through 2.7.12) and smoke-tested on the 2.7.11 export pipeline: zero `.cm-md-*` hook drift, all `:root` live variables and `--pele-*` overrides consumed, exports carry exactly the 27 contract live variables
- **Pele Diagram Colors** — 9 `--pele-*` variables derived from `--code-block-bg` / `--code-block-text` / `--link-color`, replacing the 20 Mermaid variables
- **Platform backward compatibility (v0.5.3+)** — [`src/compat.ts`](src/compat.ts) probes the installed `@bytechain.cn/colamd` version and its `themes/contract.json` for contract drift; `validate` prints a "平台兼容" report line and the renderer verifies the export API surface (`applyTheme` / `setMarkdown` / `ensureAllPluginsRendered` / `buildExportHTML`) before rendering. Platform upgrades produce actionable diagnostics (version + fix command) instead of cryptic mid-render failures

### Security & Performance (v0.4.0+)

- **SSRF Protection** — URL extractor validates against protocol whitelist and blocks private network access to prevent Server-Side Request Forgery attacks
- **Input Validation** — CSS files validated for extension, size limit (1MB max), and content validity to prevent OOM attacks
- **Async I/O** — Non-blocking file operations for improved responsiveness during batch exports
- **Template Caching** — LRU-style cache (max 10 templates) with TTL expiration (30min) and mtime-based auto-invalidation for stable memory usage
- **Unified Error Handling** — Structured error codes (`CLIError` + `ErrorCode`) across all commands for consistent debugging experience
- **Resource Cleanup** — Explicit Puppeteer page cleanup prevents zombie processes and resource leaks

### CSS Template Engine

Handlebars-powered template produces ColaMD 2.7.12 contract CSS (≤300 lines):

| Section | Content |
|---------|---------|
| 1 | Design Tokens — `:root` seed palette (11 vars), 14 semantic colors, fonts, metrics, 9 `--pele-*` |
| 2 | Editor DOM — `#editor .cm-content` + `.cm-md-*` (headings, inline, quote, code block, table, indent) |
| 3 | Exported HTML — `.colamd-document` color layer for semantic tags |
| 4 | `@media print` — print-color fidelity only (screen rules already apply) |

### MCP Server (Model Context Protocol)

Full MCP server for AI-native integration — connect ColaMD-themes to Chatbox, Cursor, Claude Desktop, Continue, and all MCP-compatible clients.

- **14 MCP tools** covering theme extraction, export, validation, and management
- **Stdio transport** — zero network config, direct process communication
- **Chinese theme name support** — non-ASCII names handled via smart path resolution

| Category | Tool | Description |
|----------|------|-------------|
| Extraction | `extract_from_url` | Theme from web page |
| | `extract_from_docx` | Theme from Word doc |
| | `extract_from_pdf` | Theme from PDF |
| | `extract_auto` | Auto-detect source |
| Management | `list_themes` | List all themes |
| | `validate_theme` | Validate theme rules |
| | `check_fonts` | Check font availability |
| | `set_theme` | Register custom theme |
| Color | `list_color_systems` | 15 built-in palettes |
| | `list_mermaid_presets` | 3 Mermaid presets |
| Export | `export_html` | Markdown to HTML |
| | `export_pdf` | Markdown to PDF |
| | `export_batch` | Batch export |

### Multi-Agent Skill

Universal skill definitions for 6 AI coding agents (7 outputs — Trae gets both workspace rules and a project skill), auto-generated from a single source:

| Agent | Skill Path | Frontmatter |
|-------|-----------|-------------|
| **Claude Code** | `.claude/skills/colamd-themes.skill.md` | `name`, `description` |
| **OpenCode** | `.opencode/skills/colamd-themes/SKILL.md` | `name`, `version`, `user-invocable`, `allowed-tools`, `hooks` |
| **OpenClaw** | `.openclaw/skills/colamd-themes/SKILL.md` | `id`, `name`, `version`, `icon`, `author`, `homepage`, `metadata.openclaw.os` |
| **Hermes** | `.hermes/skills/tools/colamd-themes/SKILL.md` | `name`, `version`, `author`, `license`, `metadata.hermes.tags`, `prerequisites` |
| **Trae (rules)** | `.trae/rules/colamd-themes.md` | Plain Markdown (no frontmatter) |
| **Trae (skill)** | `.trae/skills/colamd-themes/SKILL.md` | `name`, `description` (single-line plain scalar) |
| **DeepSeek Harness** | `.dsh/skills/colamd-themes/SKILL.md` | `name`, `version`, `description`, `metadata.dsh.tags`, `prerequisites` |

**Architecture:**

```
skills/colamd-themes/SKILL.md       ← Canonical source (single source of truth)
        │
        ▼
skills/build-skills.js              ← Cross-platform launcher (bash passthrough)
        │
        ├──→ .claude/skills/colamd-themes.skill.md
        ├──→ .opencode/skills/colamd-themes/SKILL.md
        ├──→ .openclaw/skills/colamd-themes/SKILL.md
        ├──→ .hermes/skills/tools/colamd-themes/SKILL.md
        ├──→ .trae/rules/colamd-themes.md
        ├──→ .trae/skills/colamd-themes/SKILL.md
        └──→ .dsh/skills/colamd-themes/SKILL.md
```

**Regenerate all agent skills:**

```bash
npm run build:skills            # generate all (cross-platform, works without bash on PATH)

# Or generate for a single agent:
npm run build:skills -- claude
npm run build:skills -- opencode
npm run build:skills -- openclaw
npm run build:skills -- hermes
npm run build:skills -- trae
npm run build:skills -- trae-skill
npm run build:skills -- dsh
```

To customize: edit `skills/colamd-themes/SKILL.md`, then run `npm run build:skills`.

### DSH Plugin (dsh-market)

The package is also a **DSH (DeepSeek Harness) plugin bundle** installable from dsh-market:

- **Plugin contract** — `package.json` declares `dsh.bundle.patch` pointing to [`cordis.patch.yml`](cordis.patch.yml), which inserts the `colamd-themes` Cordis entry into the profile's composition
- **Host entry** — [`src/dsh-plugin.ts`](src/dsh-plugin.ts) exports the Cordis protocol (`name` / `inject: ["skills"]` / `apply`) and registers the bundled `skills/colamd-themes/SKILL.md` with the Harness `skills` service via `ctx.skills.registerProvider` (same provider protocol as the bundled dsh-ppt plugin)
- **CLI bins** — `colamd-themes` / `cthemes` ship with the package and become available to profile agents after install
- **Runtime compatibility** — `@deepseek-ai/dsh-skill` is declared as an *optional* peer (`^0.1.5-rc.1 || ^0.2.0-rc || ^0.2.1-rc || ^0.3.0-rc || ^0.4.0-rc`; semver's prerelease rule forces per-patch enumeration — append a comparator when a new rc line ships): the market checks it against the DSH runtime version, while standalone `npm install` is unaffected
- **Backward compatibility** — the runtime consumes only the stable `BUNDLED_SKILL_RANK` constant, and the host entry's `apply()` tolerates skills-service protocol drift (warning instead of a broken profile load)
- **Platform compat layer** — [`src/compat.ts`](src/compat.ts) probes the installed `@bytechain.cn/colamd` version and its `themes/contract.json` for contract drift, and the renderer verifies the export API surface at init; platform upgrades are diagnosed clearly at `cthemes validate`/export time instead of failing cryptically
- **Bundle contents** — `dist/` (CLI + host entry), `themes/` (16 contract CSS themes), `skills/` (bundled skill), `cordis.patch.yml`

Install from a DSH profile (once published to npm): add `@bytechain.cn/colamd-themes` through the dsh-market UI or `dsh plugin --profile <name> add @bytechain.cn/colamd-themes`.

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

# Both formats in one pass (shared renderer/browser startup)
cthemes export docs/ --format html,pdf -t elegant -d output/
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
| `validate <file>` | Validate a theme against the 2.7.12 contract and paradigm rules (with a platform compat report) |
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
| `--format` | Batch format: `html`, `pdf`, or a comma-separated combo like `html,pdf` (default: `html`) |
| `--format` | PDF page size: `A4`, `Letter`, `A3` (default: `A4`) |
| `--keep-fonts` | Keep inlined base64 math fonts (default strips them when the source has no math) |

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
│  Validators         │  WCAG contrast + paradigm + 2.7.12 contract
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Template Engine    │  Handlebars → 2.7.12 CSS (≤300 lines)
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
│  │  buildExportHTML({title}) → .html │       │
│  │  page.pdf()        → .pdf   │             │
│  └─────────────────────────────┘             │
└─────────────────────────────────────────────┘
```

## Design Paradigm (2.7.12 contract)

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
│   └── build-skills.js                     # Cross-platform launcher (generates agent files)
├── .claude/skills/colamd-themes.skill.md   # Claude Code skill
├── .opencode/skills/colamd-themes/SKILL.md # OpenCode skill
├── .openclaw/skills/colamd-themes/SKILL.md # OpenClaw skill
├── .hermes/skills/tools/colamd-themes/     # Hermes skill
├── .trae/rules/colamd-themes.md           # Trae rules
├── .trae/skills/colamd-themes/            # Trae project skill
├── cordis.patch.yml                        # DSH plugin bundle patch (dsh-market)
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
│   ├── dsh-plugin.ts                        # DSH host entry (Cordis skill provider)
│   ├── compat.ts                            # Platform compat layer (contract drift + renderer API probe)
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
│       ├── theme-paradigm.md               # v4.0 design specification (2.7.12 contract)
│       └── theme-template.hbs              # Handlebars CSS template
└── tests/
```

## Tech Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| Runtime | Node.js + TypeScript | ESM modules, strict typing |
| CLI framework | Commander.js | Argument parsing, subcommands |
| CSS templating | Handlebars | 2.7.12 contract CSS generation |
| HTML parsing | Cheerio | DOM traversal for URL extraction |
| CSS parsing | css-tree | CSS rule AST parsing |
| DOCX parsing | Mammoth | Word → HTML conversion |
| PDF parsing | pdf-parse | PDF text extraction |
| HTTP client | Axios | Web page fetching |
| Browser engine | Puppeteer | Headless Chromium for HTML/PDF export |
| Editor engine | @bytechain.cn/colamd | CM6-based Markdown renderer (2.7.12 contract) |
| Terminal output | Chalk + Ora | Colored text + spinners |

## License

MIT
