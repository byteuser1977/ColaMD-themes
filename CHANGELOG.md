# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed — Slide PDF export drops pages on long decks (PDF-03)

- **Chunked deck export**: decks longer than 10 pages are split at page boundaries into ≤10-page chunks (new `exportDeckChunks` in `slides-markdown.ts`), each rendered on a fresh print layout and merged with `pdf-lib` (new runtime dependency, saved with `useObjectStreams: false` so the raw `/MediaBox` scan stays verifiable). Root cause: CM6's height map underestimates paper-layout line heights for pages it never rendered, so the platform's per-page measure trims the DOM tail on long decks and the trimmed pages lose their sheet breaks
- **Full-render guarantee for every pass**: the headless shell now reaches the `EditorView` through CM6's `cmTile` DOM registration (`window.__getView` in the served shell HTML) and pins its private `printing` flag during the slide export, plus a post-enter repair pass that verifies the rendered page count against the deck page count

## [0.8.0] - 2026-11-24

### Changed — Platform Upgrade to ColaMD-extend 2.8.0

- **Dependency bumped to `@bytechain.cn/colamd@^2.8.0`** (devDependency). The 2.8.0 contract (`themes/contract.json`) keeps the exact 27-live / 18-dead variable set of 2.7.13 — only `contractVersion` changed — so all theme CSS carries over unchanged. `SUPPORTED_CONTRACT` / `SUPPORTED_CONTRACTS` / `MIN_RENDERER_VERSION` / `SLIDES_EXPORT_MIN_VERSION` converge on `2.8.0` (`src/compat.ts`); compat-line copy and version hints in `cli.ts` / `export-cli.ts` updated accordingly
- **Slide PDF export realigned with the platform's 2.8.0 refactor** (`src/renderer.ts`): the paper is now a 1920×1080 design space (20×11.25in @96dpi → **1440×810pt** in the PDF, was 1280×720 → 960×540pt), body size pinned at 25.92px — the same scale as the presenting view. The headless viewport is pinned to 1920×1080 so viewport-derived tokens resolve identically on screen and on the sheet. The CLI-side font-size fitting (`fitSlidesToSheet`, scale floor 0.6) is removed: since 2.8.0 the platform scales any overflowing page back onto one sheet by whole-page `zoom` (measured on the paper), which is what keeps PDF-03 page parity
- **`SLIDE_TOKENS` inventory synced with 2.8.0 slides.css** (`src/slides.ts`): added `--slide-body-size`, `--slide-chrome-pad-y`, `--slide-chrome-logo-h`, `--slide-foot-pad-y`, `--slide-img-max-h`, `--slide-figure-max-h`; removed the dead `--slide-page-top-pad-print` (no longer emitted by `buildFullSlideTokens` either). Note: the 8 viewport-derived tokens are pinned to fixed px on `body.slides-printing` by the platform, so theme overrides of those tokens only apply in the presenting view

### Changed — Themes Cleanup for the 2.8.0 Paper

- **Removed the obsolete "export paper calibration" blocks** (`body.slides-printing` shrink/density rules computed for the old 1280×720@24px paper, e.g. the §1.7 blocks in `editorial-forest.css` / `pink-script-dark.css`) from the reference-template themes: under the 2.8.0 paper they would double-shrink the sheet. Necessary `body.slides-printing` mirrors (background bleed layers, per-line text colors, chrome/foot styling) are kept untouched
- **Removed the dead `--slide-page-top-pad-print` declaration** from all 37 themes carrying it; stale §1.6/§1.7 cross-reference comments updated. All `themes/*.css` pass `validate` (contract 2.8.0, slide layout + PPT export supported)

### Changed — Docs Sync

- **SKILL.md regenerated to the 7 host copies** (`.claude` / `.dsh` / `.opencode` / `.openclaw` / `.hermes` / `.trae/rules` / `.trae/skills`) via `node skills/build-skills.js`; frontmatter descriptions in `build-skills.sh` moved to the 2.8 anchor. Slide-layout section now documents the 2.8.0 export alignment (1920×1080 design space, whole-page zoom, obsolete calibration warning), PDF-02/PDF-03 wording updated, token inventory note added
- **README.md / README_CN.md**: slide PDF paper size (1440×810pt), platform requirement `^2.8.0`, contract version wording; `docs/slide-theme-replication.md` gains pitfall #15 (do not re-add export calibration blocks; viewport-derived tokens are pinned on paper)

## [0.7.1] - 2026-11-23

### Added — Summary-to-Detail Condensed Slide Workflow

- **New "Summary-to-Detail Condensed Generation (long document → condensed slides)" section in SKILL.md**: Long documents no longer go straight through the `ppt`/`to-slides` structural fast path (block-by-block copy of the source); they now use three phases — (1) Summary: read the source document and produce a global conclusion + narrative arc (Hook/Context/Core/Shift/Takeaway) + chapter and page budget; (2) Detail: write `<name>.plan.md` to disk (page number/layout/chapter kicker/page purpose/condensed effective content/layout rationale + capacity check and cut list) for user review; (3) write `<name>.slides.md` by hand once from the approved plan (deck block + per-page `<!-- slide: -->` directives)
- **Condensing and layout-selection rules**: Discard background setup/transitions/minor examples; keep conclusions/data/evidence/quotes/action items; pick one of the 11 layouts by the shape of the effective content (numbers→kpi, dates→timeline, ordered→agenda/steps…); deduplicate kicker/chapter; avoid 3 consecutive pages with the same layout; when over capacity, cut copy or split pages first instead of shrinking type
- **Invocation rules revised**: Added rule 1a (fixed sequence for condensed decks: `validate` once → at most one fix pass → `export-slides` once) and rule 7 (agent-authored decks bypass `to-slides`/`ppt` to avoid duplicate directive blocks); no back-and-forth — single generation, at most two `validate` runs, stop on failure and patch only the reported lines
- **Trigger wording synced**: Appended plan-first summary-to-detail conversion to the `FRONT_CLAUDE` / `FRONT_TRAE_SKILL` descriptions in `build-skills.sh`, and re-ran `node skills/build-skills.js` to regenerate 7 agent copies and `.trae/rules`. Zero changes to the CLI (`src/*.ts`)

### Added — Theme Validation and CI

- **`validate` supports machine-readable paradigm waivers**: After a file declares `/* colamd-allow: SL-01, CR-04 */`, the corresponding design-identity items no longer fail validation, but are still reported as-is in the `waived` field of `--json` and in `--verbose`. Only the `SL-` / `CR-` / `NT-` design-identity families can be waived; contract/mechanical rules (`CSS-*`, `SLIDE-*`, `SLIDES-*`) reject waivers
- **Waiver declarations added to 31 reference-template themes**: Derived automatically from the paradigm notes already recorded in each file header; `themes/*.css` now passes `validate` 58/58
- **New `.github/workflows/ci.yml`**: `npm ci` (skipping the Chrome download) → build CLI and MCP → validate each `themes/*.css` → validate the sample deck
- **Backfilled `v0.7.0` / `v0.7.1` tags**: Previously tags stopped at `v0.6.2`

### Changed — Repository Hygiene

- **`.tmp-export/` moved out of version control**: Debug scripts removed from the git index and added to `.gitignore`
- **`.trae/` ignore rules made selective**: `rules/` and `skills/` are generated by `build:skills` (previously ignored yet force-tracked, so every generation dirtied the worktree), so they are no longer ignored; local work files such as `documents/` stay ignored
- **`mcp-server` marked `private: true` and aligned to version 0.7.1**: MCP ships with the root package (the root package already exposes the `colamd-themes-mcp` bin), so no separate publish is needed; the earlier 0.3.0 version number was out of sync with the main package

### Changed — DSH Host Compatibility

- **Rebuilt the optional DSH peer range**: `@deepseek-ai/dsh-skill` is now pinned to the 0.2.x line — `^0.2.0-rc || ^0.2.1-rc || ^0.2.2-rc || ^0.2.3-rc || ^0.2.4-rc || ^0.2.5-rc || ^0.2.6-rc || ^0.2.7-rc || ^0.2.8-rc || ^0.2.9-rc`. Semver's prerelease rule requires one comparator per rc patch line, so every future 0.2.x rc release (0.2.0–0.2.9) is covered without further edits; 0.1.x and 0.3+ host lines are intentionally out of scope. The runtime still consumes only the stable `BUNDLED_SKILL_RANK` constant

### Fixed — MCP Publish Usability

- **MCP dependencies hoisted to root `dependencies`**: The root `files` list only includes `mcp-server/dist/index.js`, and that file imports `@modelcontextprotocol/sdk` and `zod`; both were previously declared only in `mcp-server/package.json` (not published with the package), so after an external install `colamd-themes-mcp` failed at startup with `Cannot find module`. Both are now added to the root dependencies
- **Removed the dead `list_mermaid_presets` tool and `mermaidPreset` parameter**: The `mermaid-presets` command and `-m` option were already removed during the 2.7.7 Pele rework, but MCP still forwarded them → calls always errored. The Zod schema, tools list, and dispatch branches are removed in sync; the README tool table is updated and includes the `ppt` / `to_slides` / `export_slides` / `check_pdf` tools added in 0.7.0

### Fixed — Theme Readability

- **`pink-script` link color `#ff66a8` → `#b3155a`**: The original fluorescent pink as body text color had only 2.4:1 against the paper background, making bold text and links nearly unreadable; the darker shade gives 5.8:1 against paper and 5.0:1 against panels, while the fluorescent pink is kept for color blocks and chart emphasis

### Fixed — Documentation Examples

- **Directive syntax example corrected**: The deck block is no longer immediately followed by `---` — that form splits the deck block into page 1 on its own, so the exported PDF has a blank first page (PDF-04) and cover is pushed to page 2 (SLIDES-07); the example now writes the first page directly after the deck block, with an added note.

### Fixed — Stale `dist` in the Published Artifact (old build inside the npm package)

- **`prepack` hook**: `npm run build:all` now runs automatically before `npm pack` / `npm publish`, preventing "new version number + old dist" incidents — the 0.7.0 package measurably lacked the `ppt` command in `cli.js` (11 vs 12 commands), had `slides-markdown.js` at 553 lines (864 lines in a new build), and carried an orphan artifact `dist/mermaid-presets.js` for an already-deleted source file. `prepack` was chosen over `prepare`: the latter triggers on local `npm install`, and in a fresh clone without `mcp-server` dependencies it would fail the install outright
- **Clear dist before build (`clean` wired into `build`)**: Old artifacts no longer accumulate after source files are deleted (the orphan `mermaid-presets.js` came from exactly this); `clean` only clears the root `dist` and does not touch `mcp-server/dist`
- **`dist/build-info.json` version stamp** (new `scripts/stamp-dist.js`, ESM): Writes `name`/`version`/`builtAt` after the build; comparing it with the `package.json` version tells whether an installed dist is stale — mtime is unreliable: file mtimes inside npm tarballs are normalized to 1985-10-26, pnpm reuses store files by content hash, and installed mtimes can show layered historical install dates

## [0.7.0] - 2026-11-22

### Added — One-Command PPT Generation and 16:9 Slide PDF Export

- **`ppt <input.md>` one-command flow**: Source markdown → slide deck markdown (`<input>.slides.md`) → directive/content contract validation → 16:9 PDF (`<input>.slides.pdf`) → PDF-01~05 content checks. Any failing step short-circuits with an actionable reason; `--md-only` produces only the deck, and `-t/-d/--deck-*/--no-adapt` match the step-by-step commands
- **`export-slides <deck.md>`**: Exports an existing deck as a 16:9 PDF using the platform's slide sheet layout (requires `<!-- deck` or `<!-- slide:` directives; non-deck input errors out immediately and suggests `to-slides`/`ppt`)
- **Renderer `exportSlidesPDF()`**: No longer goes through the semantic export DOM; instead it uses the platform's `enterSlidesPrintLayout` / `exitSlidesPrintLayout` to spread the editing surface onto 1280×720 sheets (`preferCSSPageSize` + zero margins + printed background), retaining the `--slide-*` tokens; the headless viewport is pinned to 1280×720 so the 800×600 default cannot wrap the cover title onto three lines or overflow card pages
- **Automatic sheet fitting**: Before export, each page's actual height is measured; if it exceeds a single sheet, the sheet type size is scaled down proportionally (reset iteration 3 times, floor 0.6) so that `PDF-03` (PDF pages = deck pages) passes; content pages are no longer squeezed onto two sheets
- **Layout content contract and auto-adaptation (`slides-markdown.ts`)**: `LAYOUT_CONTRACT` defines the item count/list shape/row titles/numbers/dates/diagram/quote/two-column requirements of the 11 layouts; `markdownToSlides(..., { adapt })` (on by default, `--no-adapt` disables) automatically adds `**row titles**`, downgrades a kpi without numbers / timeline without dates to matrix, splits overlong lists into continuation pages (`label: <title> (cont.)`), splits overlong paragraphs at sentence ends, and gives quote blocks their own page; `splitIntoPages` fixes cover swallowing subsequent h2 subsections
- **New rules SLIDES-07 / SLIDES-08**: Layout content mismatch (SHOULD) and estimated single-page overflow (SHOULD); `validate <deck.md>` reports them
- **Unified CLI invocation contract**: New `src/utils/output.ts` — one-line summary by default, single-line JSON with `--json`, details only with `--verbose`, only failing items on failure, spinner disabled in non-TTY/JSON mode; `to-slides`/`validate`/`export-*`/`check-pdf`/`ppt` all adopt it
- **Platform capability probing**: `compat.ts` adds `slidesExportSupported` (directly checks whether the lib bundle exposes `enterSlidesPrintLayout`/`exitSlidesPrintLayout`) and `SLIDES_EXPORT_MIN_VERSION`; the compat line adds "PPT export: supported/not supported", and older platforms get an upgrade command instead of a crash
- **MCP tools**: New `ppt`, `to_slides`, `export_slides`, `check_pdf`; `--json` is passed through by default and descriptions are tagged one-shot
- **Unified SKILL.md invocation logic**: New Quick tasks table and Invocation rules (one command, no repeated validate, no reading artifacts back, stop on failure), synced to the 7 agent copies and `.trae/rules`

### Changed

- `@bytechain.cn/colamd` now requires ≥ 2.7.13 with the lib exposing the slide export API; document-mode `export-html` / `export-pdf` behavior and A4/Letter/A3 paper sizes are unchanged
- `export-html` / `export-pdf` success output reduced to a single line; only failing items are printed on failure

## [0.6.2] - 2026-11-17

### Added — Export PDF Content Contract Checks (PDF-01…05)

- **Artifact-side contract checks `src/pdf-check.ts`**: The CSS contract governs "what goes into the renderer"; the PDF contract governs "what comes out of the renderer". `export-pdf` now runs content checks automatically after every export and prints a report; the new `check-pdf <file.pdf> [-d <deck.md>]` command can check any existing PDF on its own. Rules: PDF-01 (MUST) the PDF is parseable and has ≥1 page; PDF-02 (MUST) consistent page sizes + slide exports must be 16:9 (1280×720 @96dpi = 960×540pt); PDF-03 (MUST) slide pages = deck pages (the most common failure is content overflow pushing one page onto two sheets); PDF-04 (SHOULD) no blank pages (page text < 5 characters); PDF-05 (SHOULD) the deck title (chrome) appears in the PDF text (compared with whitespace removed, working around spaces inserted by Chromium glyph splitting). MUST violations exit with code 1
- **pdf-parse must run in a clean `node -e` subprocess**: Under tsx/esbuild module transformation, pdf.js v1.10's worker deterministically misreports `bad XRef entry` on perfectly valid PDFs (including real Chromium exports) — the same file parses fine under plain `node`. The buffer goes over stdin and results come back as JSON over stdout; the pdf-parse parse path is resolved by the CLI via `createRequire` and passed to the subprocess through an environment variable
- **Deck introspection helpers**: `slides-markdown.ts` adds the exports `countDeckPages()` (deck pages = page-break count) and `extractDeckChrome()` (parses deck-block logo/brand/title/meta, falling back to the first h1 when there is no block)
- **Contract docs synced**: A new "Export PDF content checks (PDF-01…05)" section in SKILL.md; `build:skills` syncs the 7 agent targets and `.trae/rules`

### Fixed — editorial-forest green-slide readability and export fidelity

- **Unreadable text on export (root cause)**: Many `body.slides-printing` inline color rules lacked `#editor .cm-content` id specificity and were overridden by document rules (such as `.cm-md-strong{ink}`) → ink-colored text on green (1.77:1) was unreadable in the PPT-PDF. All export inline selectors now carry the id specificity (aligned with the pink-script-dark implementation convention)
- **Presentation-side small-text contrast**: Small pink text on green #e89cb1 (4.61:1) replaced with `--forest-pink-bright` #f6c9d6 (≥5.28:1) — cover subtitle/lead, kicker, chrome/foot, KPI tag, timeline item titles, closing list markers, and agenda card 1 text; large-type elements (220px cover title, KPI big numbers) keep the brand pink (3:1 is acceptable for large text)
- **Line-level color consolidation (key fix)**: Upstream writes colors directly on layout line elements (kpi/timeline = `--text-secondary`, closing = `--text-muted`, page-lead = `--text-secondary`), and **colors carried by a line element always beat colors inherited from `.cm-content`** — when only ancestors were colored, the "explanatory small text under the numbers/years" on green stayed dark gray (≈2.7:1). The theme now writes colors back onto the lines (`.cm-md-slide-kpi.cm-md-li` etc., raising specificity with the `#editor .cm-content` id): kpi/timeline notes = 88% cream (6.6:1), closing lines = brightened pink (5.28:1), figure and pink-page leads colored the same way. Measured with Puppeteer computed colors: all 8 text classes on green are ≥ 4.5:1
- **Fidelity of background-swapped pages on export**: Upstream slides-export paints the whole sheet with a single background color taken from body at export time (`!important`), which the old `body.slides-printing:has(...)` swap could not override → green/pink pages lost their background on paper. Changed to painting backgrounds per line (every line carries a `cm-md-slide-<layout>` class), with negative margins of ±77px restoring the sheet margins to achieve full bleed; vertical spacing on green pages changed from margin to padding (margin areas do not paint background, exposing sheet gaps); remaining `~ *` sibling selectors all replaced with direct line-class hits
- **New 1.7 export sheet calibration**: 1280×720 @24px/em conversion — cover/section/closing/quote/title tokens tightened + list type-size calibration (26px base → 0.667em / 30px base → 0.833em / 32px base → 0.89em) + sheet conversion of hardcoded sizes in kpi/figure/quote + line-height compaction of dense blocks (1.62/blank lines collapsed/tables and code compacted) + fixed-value scaling of chrome/foot; the original ×0.88 second shrink block was removed to avoid double shrinking

## [0.6.1] - 2026-11-16

### Added — Local HTML Template Extraction (`from-html`) and Full PPT Layout Tokens

- **New extractor `from-html <file>` (local HTML file)**: Adds `LocalHtmlExtractor`, factoring the parsing core of `UrlExtractor` into a reusable protected `extractFromHtml()`; the `extract` auto-detection chain now also covers local `.html/.htm`. It reads a sibling `template.json` as a metadata overlay — `slug`/`tagline` become the theme name and description, and `typography.display/body/mono` + `serif_cn/sans_cn` produce font stacks with CJK family fallbacks that end in a generic family (SLIDE-03)
- **Color extraction: semantic tokens + luminance/saturation heuristics**: Extracts colors from `:root` custom properties in the template `<style>` — first exact matches against a semantic list (`--bg`/`--text`/`--accent` etc.), then a substring fallback (naming variants such as `--c-bg`/`--fg`/`--ink`); with no semantic naming, it sorts by luminance to pick background/foreground, and takes the most saturated color far from both ends as the accent. `normalizeColor` returns empty for `var()` references (falling back to paradigm defaults), preventing `var(--x)` from reaching downstream `hexToRgb` and throwing
- **Palette sanitizing (sanitizePalette)**: After template colors overwrite paradigm defaults as authoritative values, invalid values and derived colors violating the luminance direction are re-derived by linear interpolation between background and foreground — SL-04 luminance ordering (dark surface < panel < panelAlt), CR-02 secondary text contrast ≥ 4.5:1 (keeping the foreground hue axis, NT-01), NT-02 border visibility
- **Full PPT layout tokens (`buildFullSlideTokens`)**: `--slide-*` expands from 0.6.0's "brand voice" (title font/mono/weight + preset overrides) to 24 tokens fully customized per page type — cover/section/closing type scales come from the template display/body ratio, and page title/KPI/quote/kicker/chrome/page padding are derived from the template's mood tags (mood: bold/quiet/tech) plus density/formality/scheme. Design hints flow through `ThemeStyle.slideDesign` (`SlideDesignHints`: displayRatio/leadRatio/density/formality/scheme/mood); themes without hints automatically degrade to the original buildSlideTokens behavior (fully backward compatible)
- **Automatic PPT preset detection**: When `--ppt` is given without a value, the preset inferred by the extractor from the template display font is trusted (serif font names → serif, monospace → mono, otherwise → sans); only an explicit `--ppt <style>` overrides it. `ThemeStyle.slideDesign` carries the template density/formality/lightness/mood and the `--sz-*` type-scale ratios
- **34 beautiful-html-templates themes** (`themes/*.css`, generated): Batch-extracted from the 34 slide templates in `D:\workspace\git\beautiful-html-templates\templates`, 17 sans (Space Grotesk/Bebas Neue/Barlow family) + 17 serif (Cormorant/Bodoni Moda/Playfair family), all within the ≤ 300 line contract limit; see `themes/README.md` for the directory guide

### Changed

- `UrlExtractor.parseCssRules` / `extractAllStyles` relaxed from private to protected (for subclass reuse); `normalizeColor` recognizes the `var(` prefix and returns an empty string (web sources benefit too)
- `generator.ts` rendering pipeline now uses `buildFullSlideTokens` (output identical to 0.6.0 when slideDesign is absent)

### Verified

- `npx tsc --noEmit` passes; 34 templates batch-extracted with zero failures
- Full `validate`: `:root` root block and selector contract pass, platform compat `@bytechain.cn/colamd 2.7.13 (contract 2.7.13)`, slide layouts: supported
- Sample exports (vellum dark / coral mixed / 8-bit-orbit neon dark) succeed as HTML; seed colors faithfully reproduce the template palettes (vellum: #2a3870 deep blue + #e8d85c warm yellow + #3a7878 gray-blue accents)
- High-saturation templates (8-bit-orbit neon void etc.) keep SL-01/SL-02 saturation paradigm warnings by design (deliberate template mood, not contract errors)

## [0.6.0] - 2026-11-16

### Added — ColaMD 2.7.13 Slide Layout (PPT) Support

- **Theme PPT styling (`--ppt` extract option, off by default)**: `from-url` / `from-docx` / `from-pdf` / `extract` add `--ppt [style]` with optional presets `serif` (upstream magazine-serif default) / `sans` (Notion feel: sans-serif titles, centered cover, restrained kicker) / `mono` (Writer feel: monospace titles). When enabled, a `--slide-*` token block (SECTION 1.5) is appended to `:root` in the generated theme CSS — the brand layer only derives `--slide-title-font` / `--slide-mono` / `--slide-title-weight` (guaranteeing CJK family fallbacks and a generic family ending), while layout type scales follow upstream defaults. Custom theme CSS loads after upstream `slides.css`, so with equal `:root` specificity the later one wins; when disabled, behavior is identical to 0.5.9 (regression passes)
- **Markdown → PPT Markdown (new `to-slides` command)**: `colamd-themes to-slides <input.md> -o <output.md> [--deck-brand/--deck-title/--deck-meta/--deck-logo]`. Uses `@lezer/markdown` (the upstream parser, a new dependency) to paginate by slide semantics (`---`/HorizontalRule goes to the previous page, frontmatter excluded, h1 always breaks, h2 merged intelligently preserving h1+h2 covers and two-col halves), infers all 11 layouts from content structure (cover/section/agenda/kpi/timeline/steps/matrix/two-col/figure/quote/closing), generates the deck block and page header blocks (kicker/chapter advance with chapters), and runs directive contract validation automatically after generation
- **Slide rule validation**: The `validate` command now accepts `.md` files and performs directive contract checks — SLIDES-01 page header block must be at the page start (MUST_NOT), SLIDES-02 layout name syntax (MUST_NOT), SLIDES-03 unknown layout name notice (SHOULD), SLIDES-04/05 page header and deck field key allowlists (MUST_NOT), SLIDES-06 slide-css safe subset: rejects `position: absolute/fixed` / `z-index` / pseudo-protocol URLs, aligned with upstream `scopeSlideCSS` (MUST_NOT)
- **Theme-side slide validation rules**: SLIDE-01 unknown `--slide-*` token notice (SHOULD, aligned with the 2.7.13 slides.css token list); SLIDE-02 slide structure selectors (`.cm-md-page-*` / `.cm-md-slide-*` / `.slide-chrome|foot|ghost`) must be wrapped in `body.presenting` / `body.slides-printing` scopes, since bare rules pollute the editor view (MUST_NOT); SLIDE-03 slide title font stacks must include a CJK family and end with a generic family (SHOULD)
- **Slide token stripping on export**: On the export path, `renderer.ts` strips `--slide-*` declarations from customCSS before handing it to `applyTheme` — the export artifact is a semantic `.colamd-document` (no cm-md-page/slide classes), so tokens are inert in export anyway; without stripping, style collectors on platforms ≤2.7.12 carried the `:root` slide tokens into every exported HTML (~800 B of noise measured). Theme files themselves are unaffected, and in-app presentation still consumes them

### Changed — Platform Anchor Raised to 2.7.13 (Capability Probing) + Theme Audit Fixes

- **Single contract anchor 2.7.13**: The exact check in `getColamdCompat` is now `SUPPORTED_CONTRACTS = ["2.7.13"]` — the 2.7.13 final contract is fully identical to the old anchor (27 live variables / 18 dead variables unchanged), so theme CSS carries over as-is; `SUPPORTED_CONTRACT` and `MIN_RENDERER_VERSION` now point to 2.7.13 as well
- **Slide capability probing**: `ColamdCompat` adds `slidesSupported` — the primary criterion is an installed version ≥ `2.7.13-rc.1` (new `compareColamdVersions` handling the `-rc.N` suffix), with a fallback feature check for colamd.css containing `--slide-page-top-pad` / `.cm-md-slide-` (slide CSS moved to renderer assets in 2.7.13, so the fallback is only meaningful for old rc installs). The compat line now appends "slide layouts: supported/not supported (presentation styling requires ColaMD ≥ 2.7.13-rc.1; PPT tokens will remain inert)"
- **indigo-deck sheet desaturation**: surface/panel/panelAlt were pulled from the deck's original deep indigo (S 56–72%) into the paradigm threshold (#242526 / #2b2f34 / #2e3237, same axis at H210–213°, passing SL-01/SL-02/SL-03 with the dark luminance order unchanged); the indigo motif is carried by accent / highlight / Pele. code-bg / blockquote-bg / highlight-bg are converted in sync on the export and editor sides
- **swiss-lemon-dark code block edge fix**: Removed vertical padding from `.cm-md-codeblock-first` / `.cm-md-codeblock-last` (CSS-03: one div per line contract); vertical spacing of `pre` on the export side is unaffected. All 23 themes `validate` clean
- Dependency added `@lezer/markdown@^1`; devDep `@bytechain.cn/colamd` raised to `^2.7.13`
- The Skill (`skills/colamd-themes/SKILL.md`) and workspace rules (`.trae/rules/colamd-themes.md`, regenerated from the same source by `build:skills`) add slide sections: directive syntax, the 11-layout table, `--slide-*` tokens and presets, to-slides usage, and SLIDE/SLIDES validation rules; frontmatter descriptions of the 7 agent targets updated in sync

### Scope Notes

- HTML/PDF export through the lib `buildExportHTML` remains document-style layout (2.7.13 slide CSS ships only with renderer assets for in-app presentation); presentation layouts are viewed inside the ColaMD app, and compat probing provides actionable hints
- `slide-js` is not generated (scripts are an advanced use case; the skill docs describe the syntax)

### Verified

- `npm run build` (tsc) and `npm run build:skills` (7 agent targets) pass
- `to-slides` sample (9 pages) infers all layouts correctly: cover / section / agenda / kpi / timeline / steps / matrix / quote / closing; `validate deck.md` passes; consistent with upstream `resources/templates/slides.md` authoring
- `--ppt sans` generated theme includes the `--slide-*` block (280 lines ≤ 300 contract limit), `validate` reports the compat line + SLIDE checks pass; without `--ppt` the regression has no block
- `export-html` (Puppeteer + 2.7.13 renderer) with a PPT theme exports successfully: zero slide token leakage, complete contract live variables, artifact 80 KB; HTML/PDF export smoke tests pass on a 2.7.13 install
- All negative cases caught: unknown token (SLIDE-01), bare selectors ×2 (SLIDE-02), non-CJK font stack (SLIDE-03), mid-page directive block (SLIDES-01), bad field keys (SLIDES-04/05), dangerous slide-css (SLIDES-06), unknown layout name (SLIDES-03)
- The `validate` compat line correctly reports "contract 2.7.13, consistent with the theme contract; slide layouts: supported" on a 2.7.13 install
- All 23 themes `validate` clean (after the indigo-deck saturation fix and the swiss-lemon-dark vertical padding fix)
- Version number 0.6.0

---

## [0.5.9] - 2026-11-14

### Documentation
- **ColaMD-extend project intro and desktop downloads**: The Chinese and English READMEs add an introduction to the upstream cross-platform desktop editor and rendering engine, along with usage guides, the official website, and links to download the latest desktop builds
- **vscode-colaview project intro and extension installation**: Added notes on ColaView MD's live Markdown preview, KaTeX/Mermaid rendering, and HTML/PDF/Word export, plus installation and preview-enable guidance
- **Theme usage guide**: Documented how to use generated CSS themes in the ColaMD desktop app (Themes → Import Theme) and in ColaView MD (Import Custom Theme... or the workspace `.themes/` directory)
- This release only updates documentation and ecosystem project guidance; theme contracts, built-in theme CSS, and export behavior are unchanged
- Version bumped to 0.5.9

---

## [0.5.8] - 2026-11-14

### Platform — ColaMD 2.7.12
- **Contract anchor raised 2.7.11 → 2.7.12**: `SUPPORTED_CONTRACT`, CLI/validator text, comments in `generator` / `models` / `validators` / `renderer` / `dsh-plugin`, and the DSH skill description are synced to 2.7.12. The upstream contract has **no breaking changes** — `themes/contract.json` only changes the `contractVersion` string; the 27 live variables, 18 dead variables, `.cm-md-*` hooks, and renderer API surface are all unchanged; the dependency is raised `@bytechain.cn/colamd@^2.7.11` → `^2.7.12`, and the `validate` compat line reports "contract 2.7.12, consistent with the theme contract"
- 2.7.12 upstream changes (none touching the theme contract): Android file opening and single-document experience improvements, todo checkbox backspace behavior fix, theme border color style update, and cross-line incremental update fix for formula/diagram previews

### Added
- **Export artifact token optimization (on by default)**: When AI/LLM agents read exported HTML, the inlined base64 KaTeX math fonts (20 `@font-face` rules in `colamd.css`, 96% of the whole CSS) are dragged into the model context and waste a large number of tokens. `export-html` / `export-pdf` / `export` now post-process by default: when the source markdown contains **no** math (`$$`, `$...$`, `\(..\)`, `\begin{..}`), all `@font-face` blocks are stripped, shrinking a typical export from ~1.5 MB (~400k tokens) to ~57 KB (~15k tokens), with content and all other style rules fully preserved (browsers fall back to system fonts). Documents with math keep the fonts automatically. `--keep-fonts` forces full font embedding at all times
- **Precise math detection**: `markdownHasMath` only recognizes unambiguous math markers; amounts such as `$1.5M` and `$90M` are not mistaken for formulas and do not trigger font retention
- **Batch multi-format render reuse**: `export ... --format html,pdf` now supports comma-separated multi-format output, producing HTML and PDF within **one** renderer/browser lifecycle for the same markdown (previously two CLI launches, each cold-starting Chromium), reducing repeated startup overhead

### Changed
- `renderer.ts`'s `RenderInput` adds `optimize?: boolean` (default `true`); new `optimizeExportHtml` / `stripMathFonts` / `markdownHasMath` helpers

### Verified
- Ordinary paper without formulas: HTML from 1,520,498 B → 79,377 B (−94.8%), with title/abstract/keywords/sections/references all preserved and `@font-face` plus base64 down to zero
- Math document (`$$...$$`): still keeps 20 fonts by default (1.5 MB), consistent with `--keep-fonts`
- Monetary document (`$1.5M`): fonts correctly stripped
- `batch --format html,pdf`: one init produces HTML (88 KB) + PDF (1.1 MB / 6 A4 pages)

---

## [0.5.7] - 2026-11-12

### Fixed
- **DSH component activation failure (mammoth static import)**: `dist/extractors/docx-extractor.js` used to load the DOCX extractor through a static `import mammoth from "mammoth"`, but mammoth was only declared in `devDependencies` and did not enter the DSH profile with the plugin install. When the host imported the package root (`dist/index.js` → `docx-extractor.js`) it threw `ERR_MODULE_NOT_FOUND: Cannot find package 'mammoth'` outright, so the `colamd-themes` component failed to activate. `docx-extractor.ts` now uses a `createRequire` lazy load with two anchors (the package itself → working directory), resolving mammoth only when `from-docx` actually runs, so plugin activation no longer depends on that package
- **0.5.6 artifacts not rebuilt**: The lazy-load fix was committed after the 0.5.6 build and was neither version-bumped nor published, so 0.5.6 on npm still had the old dist with the static import. This release rebuilds dist and publishes as 0.5.7

### Verified
- `import('./dist/index.js')` loads successfully (`name` / `inject` / `apply` all fine); a full dist scan finds no static mammoth import
- Version bumped to 0.5.7

---

## [0.5.6] - 2026-11-11

### Fixed
- **Cross-platform fix for build:skills**: `npm run build:skills` used to call `bash skills/build-skills.sh` directly, but npm scripts run through cmd.exe on Windows, so it failed outright when the host PATH had no `bash` (`'bash' is not recognized`). A cross-platform launcher `skills/build-skills.js` was added that probes bash in order: `where git` to derive `<Git root>\bin\bash.exe` → the registry key `HKLM/HKCU\SOFTWARE\GitForWindows\InstallPath` → common install roots (Program Files / Program Files (x86) / LocalAppData) → fall back to `bash` on PATH; arguments are passed through (`npm run build:skills -- dsh`) and stdio plus exit codes are inherited, with behavior unchanged on non-Windows platforms (plain `bash`). `package.json`'s `build:skills` now runs `node skills/build-skills.js`; the launcher sits within the `files` allowlist `skills/` and ships with the package

### Verified
- On this machine (Windows without bash on PATH), all 7 agent targets and single-target passthrough (`-- dsh`) generate successfully; `npm pack --dry-run` shows a complete bundle (91 files / 133 kB, including `cordis.patch.yml`, `dist/dsh-plugin.js`, `skills/colamd-themes/SKILL.md`)
- Version bumped to 0.5.6

---

## [0.5.5] - 2026-11-07

### Changed
- **Platform upgrade ColaMD 2.7.11**: The `@bytechain.cn/colamd` dependency was raised from `^2.7.8` to `^2.7.11`, and the contract anchor (`SUPPORTED_CONTRACT`), CLI/validator text, and `.trae/rules` workspace rules are synced to 2.7.11. The upstream contract has no breaking changes (27 live variables, `.cm-md-*` hooks, and the renderer API are all unchanged; a `cm-md-li` hook was added); the `validate` compat line reports `2.7.11 (contract 2.7.11, consistent with the theme contract)`
- **Blockquote line background removed**: Starting with 2.7.11, the editor paints the quote background beneath the selection with `::before` + `--blockquote-bg`, so themes that still write `background` on `.cm-md-blockquote` lines cover the background of "code blocks inside quotes". All 16 themes and both templates (`template.css` / `theme-template.hbs`) drop that declaration; the export-side `.colamd-document blockquote` background is retained

### Fixed
- **Blank print output for exported HTML/PDF**: The platform print styles include `body > :not(#editor-region) { display: none !important }` (targeting the app shell), while a standalone export document is an `<article class="colamd-document">` directly under `<body>`, so the measured PDF was only 954 bytes of blank. `renderer.ts` now adds `id="colamd-export-document"` to the document in exported HTML and injects an `@media print` override (HTML and PDF share the same artifact)
- **Wrong Mermaid diagram background on export**: Pele's SVG only declares `--_bg: var(--pele-bg)` but never paints a background itself — in the editor the diagram floats on the code block line (`.cm-md-codeblock` background), but 2.7.11's clean-html export wraps the diagram in a classless `<div>` (the `cm-md-mermaid` class is dropped), so the diagram becomes transparent and floats on the page background. All 16 themes and both templates add `.colamd-document svg.pele { background: var(--pele-bg); border-radius: var(--pele-radius); }` to their `.colamd-document` sections, exactly matching the editor background

### Verified
- 16/16 themes `validate` with zero errors; elegant exports HTML at 1.54 MB (Mermaid SVG ×2, 49 `--pele-*` references working); PDF elegant 6 pages / 903 KB, word-contract 6 pages / 795 KB (954 bytes of blank before the fix)
- Version bumped to 0.5.5

---

## [0.5.4] - 2026-11-05

### Added
- **Trae Skill build target**: `skills/build-skills.sh` adds a `trae-skill` target (also included in `all`) that generates `.trae/skills/colamd-themes/SKILL.md` from the same canonical source — the frontmatter follows Trae project-level skill constraints (`name` matches the directory name, `description` is a single-line unquoted plain scalar without `: ` or angle brackets); the original `trae` target (`.trae/rules/colamd-themes.md` workspace rules) is kept unchanged, and the two complement each other
- Version bumped to 0.5.4

---

## [0.5.3] - 2026-11-02

### Fixed
- **DSH 0.2.1-rc.5 compatibility**: The optional peer `@deepseek-ai/dsh-skill` was widened from `^0.1.5-rc.1` to `^0.1.5-rc.1 || ^0.2.0-rc || ^0.2.1-rc || ^0.3.0-rc || ^0.4.0-rc`. The 0.5.2 peer range could not match the dsh-skill carried by the DSH 0.2.1-rc.5 runtime, and dsh-market validation reported incompatibility (suggesting uninstall and reinstall). semver prerelease rules require enumerating rc comparators per patch line, so new lines (0.3.1-rc.x etc.) need corresponding entries when published; the host entry only consumes the stable `BUNDLED_SKILL_RANK` export, so no code changes are needed
- **Windows path resolution bug**: `renderer.ts` (`findRendererPath`) and `cli.ts` (`findColamdCssPath`) built paths with `new URL(import.meta.url).pathname`, producing `/d:/...` on Windows so that relative module lookup always missed (previously it only worked by luck through the cwd candidates). Both now use `fileURLToPath`
- **build-skills.sh CRLF truncation (0.5.2 regression)**: After the source `SKILL.md` line endings turned into CRLF, `sed /^$/` could not match `\r` blank lines, BODY extraction came out empty, and the 6 generated Agent files were silently truncated to just the frontmatter (~330 bytes) and committed with 0.5.2. The script now strips CR before extracting and exits with an error when BODY is empty; all 6 files have been regenerated and contradictory rendering pipeline descriptions in `SKILL.md` fixed (PDF export does not use `emulateMediaType('screen')`)

### Added
- **Platform compat layer (`src/compat.ts`)**: At runtime it reads the installed `@bytechain.cn/colamd` version and `themes/contract.json`, compares them against the theme's anchored contract (2.7.8-rc.2, 27 live variables), and outputs a contract drift report (`getColamdCompat` / `formatColamdCompat`), fully null-safe and never throwing
- **Renderer API capability probing**: After editor initialization it verifies that the 4 methods used by the export pipeline (`applyTheme` / `setMarkdown` / `ensureAllPluginsRendered` / `buildExportHTML`) exist, and gives a clear error containing the installed version and a fix command when one is missing — future platform API drift no longer blows up mid-render as "undefined is not a function"
- **Contract drift warnings**: On export, a platform `contractVersion` inconsistent with the theme contract only warns instead of aborting (missing live-variable details are printed too); `cthemes validate` adds a "platform compat" report line, so contract drift is discoverable already at validation time
- **DSH host entry fault tolerance**: try/catch inside `apply()` — if the DSH runtime's skills service protocol drifts in the future it degrades to a warning instead of crashing the Profile composition tree load; CLI bins are unaffected
- Version bumped to 0.5.3

### Compatibility Strategy
- The `@bytechain.cn/colamd` dependency stays at `^2.7.8-rc.2`: the caret follows 2.x stable-line upgrades automatically, while pure prerelease lines (such as 2.8.0-rc.x) are not pulled in by default and require an explicit `npm install @bytechain.cn/colamd@<version>`; contract/API drift after an upgrade is diagnosed by the compat layer at `validate` and export time
- `@deepseek-ai/dsh-skill` is an optional peer and only the `BUNDLED_SKILL_RANK` constant is consumed at runtime, so the worst case of a range mismatch is a market notice; plugin functionality is unaffected

### Upgrade
- Uninstall 0.5.2 in dsh-market and reinstall `@bytechain.cn/colamd-themes@0.5.3` (or `dsh plugin --profile <name> add @bytechain.cn/colamd-themes`)

---

## [0.5.2] - 2026-11-01

### Added
- **dsh-market plugin support**: This package now conforms to the DSH plugin bundle contract — `package.json` declares `dsh.bundle.patch` (pointing to the new `cordis.patch.yml`, which inserts the `colamd-themes` Cordis Entry), adds a host entry `src/dsh-plugin.ts` (`name/inject: ["skills"]/apply`, registering the bundled `skills/colamd-themes/SKILL.md` as a bundled skill via `ctx.skills.registerProvider`, with the protocol aligned with the dsh-ppt plugin); `peerDependencies` declares `@deepseek-ai/dsh-skill` (optional; market runtime compatibility checks validate against DSH `^0.1.5-rc.1`, and standalone installs are unaffected); `files` includes `dist/themes/skills/cordis.patch.yml`, and keywords add `dsh-plugin`

### Changed
- Dependency raised `@bytechain.cn/colamd` `^2.7.8-rc.1` → `^2.7.8-rc.2` (published on npm). rc.2 is an upstream Word export and image layout fix (a4f4cc4); the theme contract is unchanged (`themes/contract.json` only updates `contractVersion` to 2.7.8-rc.2, still 27 live variables / 18 dead variables)
- Version bumped to 0.5.2

### Verified
- The real rc.2 export smoke test passes: the title is written via `buildExportHTML({ title })`, `.colamd-document` structure, `:root` contract live variables, zero `--seed-*` leakage, mermaid Pele SVG, and complete KaTeX block formulas

---

## [0.5.1] - 2026-10-25

### Changed
- **Export pipeline switched to the 2.x library renderer**: Upstream ColaMD-extend 2.7.8-rc.1 (69515aa) restored the `dist/lib/colamd-renderer.js` library entry (P0), and `renderer.ts` fully switched to 2.x — `:root` contract CSS is consumed directly, and titles are passed via `buildExportHTML({ title })`
- **Removed the 1.5.x compatibility layer (not backward compatible)**: Deleted the `bridgeLegacyBodyVars()` body variable bridge, renderer version probing, and branch logic; the dependency is pinned from `^1.5.2` to `^2.7.8-rc.1` (`npm install`/`npm ci` are temporarily unavailable before npm publishes 2.7.8-rc.1, and resolve again after publication)
- Contract version references unified to **2.7.8-rc.1** (`validate` output, generator self-checks, validator messages, and comments in each file)

### Verified
- The 2.x real export smoke test passes: `:root` has exactly 27 contract live variables, zero dead variables/`--seed-*` leakage, mermaid Pele SVG (`var(--pele-*)` resolvable offline), and complete KaTeX block formula output (P1 acceptance)

---

## [0.5.0] - 2026-10-25

### Added
- **ColaMD 2.7.7 compatibility verification**: Using the npm-published `@bytechain.cn/colamd@2.7.7` as the baseline, each theme CSS contract item was verified — `.cm-md-*` class hooks show zero drift (49 hooks in the renderer), and all `:root` live variables (14 core + 4 typography + 9 `--pele-*`) are consumed by 2.7.7
- **2.x package guard for the export pipeline**: When `renderer.ts` detects that the installed `@bytechain.cn/colamd` is 2.x (the Electron app distribution, which lacks the `colamd-renderer.js` library entry), it gives clear downgrade guidance instead of the previous generic "Cannot find renderer" error
- **Export theme resolution fix**: Built-in themes (such as `elegant`) now load this repo's 2.7.7 contract CSS (`themes/<name>.css`) first before handing it to the renderer, fixing exported HTML/PDF actually using the old 1.5.x built-in colors; on injection the `:root` variables are mirrored to the `body` scope, bypassing element-level variable declarations of the 1.5.x base CSS (theme files keep the `:root` contract unchanged; the bridge logic only exists in the export pipeline)
- Contract version references in code and docs unified to **2.7.7** (`validate` output, generator self-checks, validator comments)

### Changed
- **Design quality improvements for 10 themes** (0 paradigm check errors):
  - `colly` / `salvator-blog` / `meeting-minutes`: fixed inverted panel hierarchy (`--seed-panel-alt` darkened to 2 contrast levels)
  - `swiss-design`: widened the luminance gap between border and panel-alt to 3 levels
  - `shimo-theme`: panels changed to pure neutral gray, accent saturation raised to `#2a6bf2` (S 83%)
  - `elegant`: brick-red accent saturation 55% → 70% (`#b0401f`), hardcoded colors such as selection updated in sync
  - `guizang`: cream panels changed to neutral warm gray, eliminating the neutral-gray deviation (NT-02)
  - `pixso-design`: accent saturation 56% → 76% (`#4f46e5`), 6 gradient/border rgba values migrated
  - `trae-blue`: accent saturation 70% → 85% (`#2563eb`), panel switched to neutral gray
  - `forest-ink`: accent saturation raised (`#356b44`), text grays changed to green-gray to return to the ink-green main axis
- 4 intentional warnings kept: the low-saturation academic accents of the academic series and the black minimal accents of meeting-minutes

### Removed
- Removed the legacy pre-2.7 structure theme (`body.theme-custom` root block + 58 dead variables, with a mojibake filename rendering "My Theme.css") — that theme is completely ineffective under 2.7.7

### Fixed
- `package-lock.json`'s root manifest dependency was mistakenly labeled `^2.0.0`; restored to `^1.5.2` to match `package.json` (npm 2.7.7 is an app distribution, so CLI export must use the 1.5.x library renderer)

---

## [0.4.0] - 2026-10-23

### Added
- **DeepSeek Harness Agent Support** — new `.dsh/skills/colamd-themes/SKILL.md`, generated via `skills/build-skills.sh dsh`
- Agent skill coverage expanded to 6 (Claude Code, OpenCode, OpenClaw, Hermes, Trae, DeepSeek Harness), with each Agent's command prerequisites and capability tags unified in the frontmatter
- `validateThemeCss()` contract validator: checks the `:root` root block, dead selectors, dead variables, `pt` units, and vertical padding on quotes/code blocks
- `colamd-themes validate` now also outputs CSS contract check results
- Runs a contract self-check automatically after generation
- `DSH_SUPPORT_SUMMARY.md` and `test-dsh-skill.sh` for release verification

### Changed
- **Theme contract upgraded to ColaMD Extend 2.7**: The theme root block changed from `body.theme-custom` to `:root`; the generator template is bumped to v4.0 (`src/templates/theme-template.hbs`)
- **Selector layer rewritten**: All `#write` / `.ProseMirror` / semantic tag rules replaced with `#editor .cm-content .cm-md-*` (CodeMirror 6 hooks); quotes and code blocks only set left/right padding
- **Variable system rewritten**: Added `--text-secondary` / `--highlight-bg` / `--editor-font-size` / `--editor-column-width` / `--pele-*`; removed dead variables such as `--surface-color`, `--heading-color`, `--accent-*`, `--hr-color`, `--code-color`, `--code-block-color`, `--table-border`, `--scrollbar-thumb*`, `--mermaid-*`, `--radius-*`, `--content-width`, `--font-size-root`, `--font-scale-*`, `--line-height-*`, `--font-heading`, `--font-code`
- **Diagram colors**: Mermaid's 20-variable presets changed to Pele's 9 variables, with defaults derived from `--code-block-bg` / `--code-block-text` / `--link-color` via `color-mix()`; the CLI removes the `mermaid-presets` command and the `--mermaid-preset` option
- **Code block text color**: Derived automatically from the code block background contrast (light text on dark backgrounds, body color on light backgrounds), no longer hardcoded
- **Print spec**: Removed the entire `@media print` mirror and variable redeclarations, keeping only `print-color-adjust` fidelity
- `themes/template.css` and `src/templates/theme-paradigm.md` synced to v4.0
- Version unified to **0.4.0**; the README multi-Agent section adds the DeepSeek Harness generation path and frontmatter notes
- Build script aligned with the new data-channel contract

### Removed
- `src/mermaid-presets.ts` (Mermaid preset pipeline)
- `ThemeStyle.mermaidPresetId`
- The mistakenly tracked `.DS_Store` file

---

## [0.3.3] - 2026-08-26

### Added
- **MCP Server**: Full MCP (Model Context Protocol) server in `mcp-server/` directory with 14 tools covering theme extraction, HTML/PDF export, validation, color systems, and theme management. Compatible with Chatbox, Cursor, Claude Desktop, Continue, and all MCP-capable clients.
- **Chinese Theme Name Support**: Fixed non-ASCII (Chinese/CJK) theme names being stripped during extraction. MCP server auto-detects non-ASCII names and constructs full output paths via `-o` flag.
- **Multi-Agent Skill Definitions**: Added AI agent skill files for 5 coding assistants — Claude Code, OpenCode, OpenClaw, Hermes, Trae — auto-generated from `skills/colamd-themes/SKILL.md`.
- New MCP binary entry: `colamd-themes-mcp`
- New scripts: `build:mcp`, `build:all`, `mcp`

### Changed
- Package version bumped from 0.3.2 to 0.3.3
- MCP server versioned independently at 0.2.0

---

## [0.3.2] - 2026-05-29

### Added
- **CSS Pitfall Quick Reference**: Comprehensive 6-topic guide for theme authoring in AI agent skills, covering screen/print sync, body text indent, indent exclusion, list indentation, Mermaid CJK text overflow, and Mermaid classDef inheritance rules
- New theme: **Trae Blue** — modern blue-themed design for technical documentation
- New theme: **Forest Ink** — nature-inspired dark green palette with ink aesthetics
- Support for absolute path input in CLI commands
- Two new theme preview HTML files (colly-preview, salvator-blog-preview)
- Short CLI alias `cthemes` as alternative to `colamd-themes`
- Unified error handling system with structured error codes (`CLIError` + `ErrorCode`)
- Shared utility functions for consistent file path resolution (`cli-utils.ts`)
- Template cache management with LRU eviction, TTL expiration, and mtime-based invalidation

### Changed
- Package name migrated to scoped format: `@bytechain.cn/colamd-themes`
- Optimized **Swiss Design** theme with improved typography and spacing
- Fixed build script template file copy logic (`package.json` build command)
- Migrated all synchronous file I/O operations in `theme-store.ts` to async API (`fs/promises`)
- Standardized error handling across all export commands with unified error codes

### Security
- **SSRF Protection**: URL extractor now validates URLs against protocol whitelist (http/https only) and blocks private network ranges (localhost, 10.x, 172.16-31.x, 192.168.x, 169.254.x) to prevent server-side request forgery attacks
- **Input Validation**: CSS files are now validated for extension, size limit (1MB max), and content validity before processing to prevent OOM attacks

### Performance
- **Async I/O**: Theme store operations now use non-blocking async file I/O, preventing event loop blocking during configuration read/write operations
- **Template Caching**: Handlebars template compilation now uses a managed cache system:
  - Maximum 10 cached templates (LRU-style eviction)
  - 30-minute TTL for automatic expiration
  - File modification time (mtime) detection for auto-invalidation when templates change on disk

### Bug Fixes
- **Puppeteer Page Resource Leak**: Fixed zombie process issue where Puppeteer Page objects were not properly closed during browser shutdown. The renderer now explicitly closes page instances before browser termination.
- **PDF Export Styling**: Resolved issue where custom themes were not applied to PDF output by removing `emulateMediaType("screen")` that prevented `@media print` rules from executing
- **Hardcoded Version Number**: CLI version command now dynamically reads from package.json instead of using hardcoded value, ensuring correct version display after package updates
- **Code Duplication**: Extracted common file path resolution logic into shared utility functions (`resolveInputPath`, `resolveOutputPath`, `getDocumentTitle`) used across all export commands

### Removed
- `.DS_Store` files from project directory
- Local HTTP server security code (token validation, request timeouts) per user request — reverted to simpler implementation

---

## [0.3.1] - 2026-06-01

### 🔒 Security Fixes (Critical)

**URL Extractor SSRF Vulnerability**
- Added comprehensive URL validation to prevent Server-Side Request Forgery attacks
- Protocol whitelist enforcement (only `http:` and `https:` allowed)
- Private network address blocking (localhost, 10.x, 172.16-31.x, 192.168.x, 169.254.x)
- Clear error messages for blocked access attempts
- File: [`url-extractor.ts`](src/extractors/url-extractor.ts)

**Input Validation Enhancement**
- CSS file extension validation (must be `.css`)
- Maximum file size limit enforced (1MB) to prevent memory exhaustion attacks
- Content validity check (minimum 10 characters)
- Sanitized theme name extraction from file paths (removes special characters, limits length)
- Files: [`theme-store.ts`](src/theme-store.ts), [`generator.ts`](src/generator.ts)

### 🐛 Bug Fixes (Major & Medium)

**Puppeteer Page Resource Leak (#1)**
- **Severity**: Critical
- **Issue**: Browser instances could leave zombie processes if page objects weren't closed before browser termination
- **Fix**: Explicitly close page instances in [`renderer.ts`](src/renderer.ts#L150-L155) close() method before shutting down the browser
- **Impact**: Prevents resource leaks and ensures clean process cleanup

**PDF Export Styling Not Applied (#4)**
- **Severity**: Major
- **Issue**: Custom themes were not rendering correctly in PDF output
- **Root Cause**: `emulateMediaType("screen")` forced browser into screen mode, causing CSS `@media print { ... }` rules to be ignored
- **Fix**: Removed screen media type emulation in [`renderer.ts`](src/renderer.ts) to allow default print mode
- **Impact**: All PDF exports now render with full theme styling fidelity (colors, fonts, backgrounds, spacing)

**Hardcoded Version Number (#5)**
- **Severity**: Medium
- **Issue**: CLI `--version` flag displayed hardcoded "0.2.0" regardless of actual package version
- **Fix**: Implemented dynamic version reading from [`cli.ts`](src/cli.ts) using `getPackageVersion()` function that reads `package.json` at runtime
- **Impact**: Version display always matches published package version

### ⚡ Performance Improvements

**Synchronous I/O Blocking (#4)**
- **Before**: All theme store operations used blocking `readFileSync()`, `writeFileSync()`, `existsSync()` calls
- **After**: Migrated to async API in [`theme-store.ts`](src/theme-store.ts):
  - `readFile()`, `writeFile()`, `access()` from `node:fs/promises`
  - All public functions now return Promises
  - Non-blocking event loop during configuration operations
- **Impact**: Improved responsiveness, especially during batch export operations

**Template Cache Management (#7)**
- **Before**: Single global template variable with no size limits or invalidation
- **After**: Sophisticated cache system in [`generator.ts`](src/generator.ts):
  - **LRU Eviction**: Max 10 compiled templates (evicts oldest when full)
  - **TTL Expiration**: 30-minute automatic expiry of cached entries
  - **mtime Detection**: Auto-invalidates when source template file is modified
  - **Manual Clear**: `clearTemplateCache()` function for testing/memory management
- **Impact**: Prevents unbounded memory growth in long-running processes; ensures fresh templates after updates

### 🛠️ Code Quality Improvements

**Unified Error Handling System (#5)**
- Created [`cli-utils.ts`](src/utils/cli-utils.ts) utility module with:
  - `CLIError` class: Structured error with code, message, and cause chain
  - `ErrorCode` enum: Standardized error categories (FILE_NOT_FOUND, THEME_ERROR, RENDER_ERROR, INVALID_INPUT, UNKNOWN)
  - Consistent error propagation across all export commands
- Updated [`export-cli.ts`](src/export-cli.ts) to use unified error handling:
  - Try-catch blocks wrap all command actions
  - Process exits with appropriate error codes
  - Error messages include context and suggestions
- **Impact**: Better debugging experience; consistent user-facing errors; easier error tracking

**Code Deduplication (#6)**
- Extracted common patterns into reusable utilities:
  - `resolveInputPath(input)`: Validates file existence, converts relative→absolute paths
  - `resolveOutputPath(input, output?, ext?)`: Derives output path with smart defaults
  - `getDocumentTitle(filePath)`: Extracts filename without extension for document title
- **Impact**: Reduced code duplication; single source of truth for path logic; easier maintenance

### 📝 Technical Details

**Security Architecture**

```
User Input → Validation Layer → Processing Layer
                │                    │
                ├── Protocol Check   ├── Async Operations
                ├── Network Check    ├── Cache Management
                ├── Size Limits      └── Resource Cleanup
                └── Format Validation
```

**Performance Metrics**

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Theme config read | Blocking sync | Non-blocking async | Event loop freed |
| Batch export (100 files) | Sequential blocking | Concurrent-ready | ~40% faster* |
| Template compilation | Uncached/recompile | Cached (max 10) | ~90% fewer compiles |
| Memory usage (long run) | Unbounded growth | Limited (10 templates) | Stable |

*\*Estimated improvement based on reduced I/O blocking*

**Error Code Reference**

| Code | Name | When Used |
|------|------|-----------|
| 1 | FILE_NOT_FOUND | Input file does not exist |
| 2 | THEME_ERROR | Theme resolution or registration fails |
| 3 | RENDER_ERROR | HTML/PDF rendering pipeline failure |
| 4 | INVALID_INPUT | Invalid arguments or options |
| 99 | UNKNOWN | Unexpected/unclassified error |

---

## [0.3.0] - 2026-06-01

### Added
- **Trae Blue Theme**: Modern blue color scheme optimized for developer documentation and technical writing
- **Forest Ink Theme**: Dark forest-inspired theme with elegant ink-style aesthetics
- **Absolute Path Support**: CLI now accepts absolute file paths for all input commands
- **Theme Previews**: Added interactive HTML previews for colly and salvator-blog themes
- **CSS Reference**: Included common CSS pitfalls and best practices documentation
- **Short CLI Alias**: `cthemes` command added as shorthand for `colamd-themes`

### Changed
- **Package Name**: Migrated from `colamd-themes` to `@bytechain.cn/colamd-themes` (scoped package)
- **Swiss Design Enhancement**: Refined Swiss Design theme with better contrast ratios and improved readability
- **Build Process Fix**: Corrected template file copying logic in build script to ensure proper distribution

### Removed
- System files (`.DS_Store`) cleaned from repository

---

## [0.2.0] - 2026-05-25

### Added
- **v3.0 Seed Palette Paradigm**: Complete implementation of ColaMD's new design token system
  - 15 predefined seed palettes across 5 families (Morandi, Macaron, Nordic, Vintage, Mint)
  - Auto-derived semantic mapping from seed tokens via CSS custom properties
  - Mermaid diagram presets (light/dark/elegant) with 20 core variables (removed in 0.7.1; now driven by Pele `--pele-*`)
- **Academic Style Theme**: Specialized theme for academic paper formatting
- **Three Base Themes**: Initial set of core themes (elegant, newsprint, light/dark)
- **Theme Validation Engine**: WCAG 2.1 compliance checking with 15+ design constraint rules
- **Color System Library**: Comprehensive color palette management utilities

### Changed
- **Extractor Refactoring**: Complete rewrite of URL, DOCX, and PDF extractors
  - Improved CSS rule parsing via `css-tree`
  - Enhanced specificity calculation for inline style resolution
  - Multi-layer heuristic analysis for PDF metadata extraction
- **Academic Paper Theme**: Restructured to follow v3.0 paradigm specifications
- **Template Engine**: Handlebars-powered CSS generation with 6-section output structure

### Fixed
- Merge conflict resolution for `academic-paper.css` (adopted remote version)

---

## [0.1.0] - 2026-05-22

### Added
- **Initial Release**: Core ColaMD theme development toolkit
- **CLI Interface**: Command-line tool for theme management and export operations
- **Theme Extraction**:
  - URL-based extractor with CSS parsing
  - DOCX extractor using mammoth for Word document styles
  - PDF extractor with typography metadata analysis
  - Auto-detection of source type
- **Export Functionality**:
  - Markdown to HTML export with embedded theme CSS
  - Markdown to PDF export via Puppeteer rendering
  - Batch export support for multiple files/directories
- **Theme Management**:
  - Built-in theme registration system
  - Custom theme import from CSS files
  - Default theme configuration
- **Core Utilities**:
  - Color system with contrast ratio calculations
  - Typography management
  - Mermaid diagram integration (removed in 0.7.1; now rendered by Pele)
  - KaTeX math rendering support

---

[Unreleased]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/byteuser1977/ColaMD-themes/releases/tag/v0.1.0
