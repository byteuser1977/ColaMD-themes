---
name: colamd-themes
description: >
  Generate, validate, and manage ColaMD v3.0 paradigm CSS theme files.
  Extract formatting from URLs, DOCX, or PDF sources; auto-match color
  systems and Mermaid presets; validate against WCAG contrast and design
  constraint rules. Use when the user wants to create, modify, list, or
  validate ColaMD themes.
---

# ColaMD Themes — v3.0 Seed Palette Paradigm

## Architecture

```
Source (URL/DOCX/PDF)
    │
    ▼
┌─────────────────┐
│  Extractor       │  Parse → raw ThemeStyle (seed palette structure)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Color System    │  Match accent+surface → 15 built-in palettes
│  (color-systems) │  Fill seed-* values (or force with --color-system)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validators      │  WCAG contrast, hue harmony, saturation constraints
│  (validators)    │  Auto-report issues by severity (MUST/SHOULD)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Mermaid Preset  │  Select light/dark/elegant by bg luminance + accent warmth
│  (mermaid-presets)│  Generate 20 core Mermaid variables
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Template Render │  Handlebars → v3.0 paradigm CSS (≤300 lines)
│  (generator)     │  SECTION 1→6 structure
└────────┬────────┘
         │
         ▼
  themes/<name>.css
```

## Core Paradigm

The v3.0 paradigm reduces theme creation to **5 seed colors + 3 font stacks**:

- **Seed palette**: `accent`, `surface`, `panel`, `panel-alt`, `ink` (with light/dark/muted/dim variants)
- **Typography**: `font-body`, `font-heading`, `font-code`, `font-mermaid`
- **Semantic mapping**: All ColaMD built-in variables auto-derived from seed tokens
- **Mermaid**: 20 core variables auto-mapped by built-in `variables.css` — theme files do NOT write SVG selectors
- **Print**: `@media print` mirrors screen styles with `!important` + `print-color-adjust: exact`

Key constraints:
- No bare color values (`#xxx`) in selectors — everything through `var(--*)`
- No bare font sizes — everything through `var(--font-*)`
- No Mermaid SVG selectors (handled by ColaMD's built-in `variables.css`)
- `!important` only in `@media print`
- Total file ≤ 300 lines

## Commands

### Extract from URL

```bash
colamd-themes from-url <URL> [options]
# or: npx tsx src/cli.ts from-url <URL> [options]
```

### Extract from DOCX

```bash
colamd-themes from-docx <file.docx> [options]
```

### Extract from PDF

```bash
colamd-themes from-pdf <file.pdf> [options]
```

### Auto-detect source type

```bash
colamd-themes extract <source> [options]
```

### List built-in color systems (15 schemes in 5 families)

```bash
colamd-themes color-systems
colamd-themes color-systems --json
```

### List Mermaid presets

```bash
colamd-themes mermaid-presets
colamd-themes mermaid-presets --json
```

### List generated themes

```bash
colamd-themes list [-d <themes-dir>]
```

### Validate a theme against v3.0 paradigm rules

```bash
colamd-themes validate <theme.css>
```

Checks WCAG contrast ratios (CR-01 through CR-06), hue harmony (HR-01 through HR-03), saturation/luminance constraints (SL-01 through SL-04), neutral axis rules (NT-01 through NT-03), font rules (FP-01 through FP-04, FS-01 through FS-08), surface hierarchy (SH-01 through SH-03), border rules (BD-01 through BD-03), and mapping prohibitions (MP-01 through MP-05). Issues are categorized as MUST, MUST_NOT, SHOULD, or SHOULD_NOT. Exit code 1 on MUST/MUST_NOT violations.

### Options (all extract commands)

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Theme name |
| `-o, --output <path>` | Output CSS file path |
| `-d, --themes-dir <dir>` | Themes directory (default: `themes/`) |
| `-c, --color-system <id>` | Force a color system (use `color-systems` to list) |
| `-m, --mermaid-preset <id>` | Force a Mermaid preset (light/dark/elegant) |
| `-A, --auto-match` | Auto-match color system and Mermaid preset |

## Color Systems (15 schemes)

| Family | Schemes | Style |
|--------|---------|-------|
| 莫兰迪 (Morandi) | misty-rose, sage-green, dusky-blue | Low saturation, muted elegance |
| 马卡龙 (Macaron) | strawberry, mint, lavender | High brightness, sweet pastels |
| 北欧 (Nordic) | fjord-blue, pine-green, cloud-grey | Clean, minimal, cool tones |
| 复古 (Vintage) | amber, burgundy, forest | Warm, rich, nostalgic |
| 薄荷绿 (Mint Green) | matcha, spearmint, seafoam | Fresh, modern greens |

## Mermaid Presets (3 presets)

| Preset | Mode | When selected |
|--------|------|---------------|
| `light` | Light theme | Cool accent hues (blue/indigo/green) on light bg |
| `dark` | Dark theme | Dark background themes (auto-detected) |
| `elegant` | Warm light | Warm accent hues (red/orange/brown) on light bg |

## AI Agent Workflow

### Creating a theme from a source

1. Run extraction with auto-match:
   ```bash
   colamd-themes extract <source> --name "my-theme" --auto-match
   ```
2. Review the generated CSS in `themes/my-theme.css`
3. If needed, tweak seed colors in SECTION 1 only
4. Validate: `colamd-themes validate themes/my-theme.css`

### Creating a theme from a color system

1. List available systems: `colamd-themes color-systems`
2. Generate with forced system:
   ```bash
   colamd-themes from-url <any-url> --name "sage-theme" --color-system sage-green
   ```
   The URL's extracted typography is kept; the color system overrides the seed palette.

### Modifying an existing theme

Edit only SECTION 1 variables in the generated CSS:
- Change `--seed-accent`, `--seed-surface`, `--seed-panel`, `--seed-panel-alt`, `--seed-ink` and their variants
- Change `--font-body`, `--font-heading`, `--font-code` to different font stacks
- All SECTION 2-6 mappings auto-follow via `var(--seed-*)` references
- Re-validate after changes: `colamd-themes validate themes/<name>.css`

### Validation rules reference

Priority: MUST_NOT > MUST > SHOULD_NOT > SHOULD

| Category | Key Rules |
|----------|-----------|
| Contrast (CR) | ink:surface ≥ 7:1 (AAA), muted:surface ≥ 4.5:1, accent:surface ≥ 4.5:1 |
| Hue (HR) | Accent saturation ≥ 0.30, max 2 saturated hues |
| Saturation (SL) | Surface S ≤ 0.05, panel S ≤ 0.10, L(surface) > L(panel) > L(panel-alt) for light |
| Neutral (NT) | ink/muted/dim on same hue axis, border S ≤ 0.05 |
| Font (FP/FS) | ≤ 4 font families, h1 scale ≥ 1.75, heading scale monotonically decreasing, must include CJK fallback, must end with generic family |
| Surface (SH) | Adjacent surface L diff ≥ 0.04, code-block:surface L diff ≥ 0.06 |
| Mapping (MP) | text-color must be seed-ink, bg-color must be seed-surface, border-color must not be chromatic |

## Output Structure

Generated CSS files follow this SECTION layout:

```
SECTION 1 — Design Tokens (user-editable)
  1.1 Seed Palette (11 vars)
  1.2 Typography (4 font stacks)
  1.3 Font Sizing (12 vars)
  1.4 Radii & Spacing

SECTION 2 — Semantic Mapping (auto-derived)
  2.1 Surface  2.2 Text  2.3 Links/Accent
  2.4 Borders  2.5 Inline Code  2.6 Code Blocks
  2.7 Blockquote  2.8 Tables  2.9 Scrollbar

SECTION 3 — Mermaid 20 Core Variables
  3.1 Container  3.2 Font  3.3 Nodes  3.4 Edges
  3.5 Clusters  3.6 Labels  3.7 Titles/Axes
  3.8 Person Nodes  3.9 Label Offset

SECTION 4 — Fine Tuning

SECTION 5 — Selector-Level Micro Adjustments
  h1-h6, strong, code, pre, blockquote, table th,
  hr, mermaid caption, responsive

SECTION 6 — @media print (screen mirror)
  Variable re-declaration + full element coverage
  with !important + print-color-adjust: exact
```

## CSS Pitfall Quick Reference

> When adjusting themes, follow these rules strictly. For each step, reference the corresponding pattern in `academic-paper.css`.

---

### 1. Screen & Print Must Stay in Sync

Every rule in SECTION 5 must have a mirror copy in SECTION 6 `@media print`. Reference the `SECTION 5 / SECTION 6` correspondence in `academic-paper.css`.

---

### 2. Body Text First-Line Indent

**Pitfall:** `#write p` does not match. **Correct:** Reference `academic-paper.css` §5.3 directly — use `body.theme-custom p, body.theme-custom #write > p`, with `margin: 0` set beforehand.

---

### 3. Indent Exclusion (Do Not Pollute Lists / Tables / Diagrams)

**Pitfall:** The `p` selector hits paragraphs inside all nested containers. **Correct:** Reference the exclusion block below `swiss-design.css` §5.2.1 — apply `text-indent: 0` uniformly to `li / li p / td p / th p / blockquote p / .mermaid-block p / figure p / pre p`.

---

### 4. List Indentation (Hardest Pitfall)

**Pitfall:** `padding-left` does not move the bullet/number; missing the `#editor .ProseMirror` editor selector; missing `li::before` and `li > p` inline conversion.

**Correct:** Reference `academic-paper.css` §5.7 directly — copy its full selector structure (`#editor .ProseMirror > ul/ol` + `#write > ul/ol:first-of-type` + `li::before` + `#editor .ProseMirror li > p`). Use `margin-left: 2em` for indentation instead of `padding-left`. For Swiss style, keep `list-style-position: outside` and do NOT change to `none`.

---

### 5. Mermaid CJK Text Overflow

**Pitfall:** Multi-line `<br/>` nodes have incorrect width/height calculations. **Correct:** ≤ 2 lines per node + `fontSize: 14px` + simplify text (use `·` instead of `/`, remove redundant modifiers).

---

### 6. Mermaid classDef Does Not Inherit themeVariables

**Pitfall:** Assuming `themeVariables` sets text color so you don't need to repeat it. **Correct:** `classDef` must explicitly declare all three properties: `fill / color / stroke`.

## Prerequisites

- Node.js ≥ 18
- Run from project root: `/Volumes/DATA/data/develop/git/ColaMD-themes`
- Install: `npm install`
- Build: `npm run build`
- Or run directly: `npx tsx src/cli.ts <command>`

## Constraints

- Never write Mermaid SVG selectors in theme files (handled by built-in `variables.css`)
- Never use bare hex colors in selectors — always `var(--seed-*)`
- Never use `!important` outside `@media print`
- Keep generated files ≤ 300 lines
- All font stacks must include CJK fallback and end with a generic family
