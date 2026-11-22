# Release Notes

## Version 0.7.1 (2026-11-23) — Publish Integrity, Theme Waivers & MCP Fixes 🔒

### 🔒 Fixed — stale `dist` shipped inside the npm package

- **`prepack` hook** — `npm pack` / `npm publish` now runs `npm run build:all` first, so the tarball always contains a rebuild of the current source. The 0.7.0 tarball shipped a stale `dist`: `cli.js` was missing the `ppt` command (11 vs 12 commands), `slides-markdown.js` was 553 lines vs 864 in source, and it carried an orphaned `dist/mermaid-presets.js` whose source file had already been deleted — DSH installs reported "dist contents are old". `prepack` is used instead of `prepare` because the latter also fires on local `npm install`, where a fresh clone lacks `mcp-server` dependencies and would fail the install
- **`clean` runs before every build** — `dist/` is wiped on build so removed sources can't leave orphan artifacts behind (the `clean` script only touches the root `dist`, never `mcp-server/dist`)
- **`dist/build-info.json` build stamp** (new `scripts/stamp-dist.js`) — writes `name` / `version` / `builtAt` at build time; compare it with `package.json` to tell whether an installed `dist` is stale. Mtime can't be trusted: npm normalizes tarball mtimes to 1985-10-26 and pnpm reuses content-addressed store files, so an installed tree shows a layer of historical install dates

### ✨ Added — plan-first condensed deck workflow (SKILL.md)

- **「总到分精炼生成（长文档 → 精炼幻灯片）」 section** — long documents no longer take the structural fast path (which copies the source block by block). Three phases: (1) 总 — read the whole document, produce a global summary + narrative arc (Hook/Context/Core/Shift/Takeaway) + section & page budget; (2) 分 — write `<name>.plan.md` (page number / layout / chapter kicker / page purpose / condensed content / layout rationale, plus a capacity check & cut list) for user review; (3) on confirmation, hand-write `<name>.slides.md` once (deck block + per-page `<!-- slide: -->` directives)
- **Condensation & layout-selection rules** — drop background/transition/minor examples, keep conclusions/data/evidence/quotes/actions; pick from the 11 layouts by content shape (numbers→kpi, dates→timeline, ordered→agenda/steps…); dedupe kicker/chapter; avoid 3 identical layouts in a row; split over-capacity pages before shrinking type
- **Invocation rules 1a & 7** — fixed sequence for condensed decks (`validate` once → at most one repair round → `export-slides` once); agent hand-written decks bypass `to-slides`/`ppt` to avoid re-injected directives. Synced into all 7 agent mirrors and `.trae/rules`; CLI unchanged

### 🛡 Added — machine-readable theme waivers & CI

- **`colamd-allow` waivers** — a theme can now declare its intentional paradigm deviations in one line, `/* colamd-allow: SL-01, CR-04 */`. `validate` stops failing on those identity items but still reports them in `--json.waived` and `--verbose`. Only the design-identity families (`SL-` / `CR-` / `NT-`) are waivable; contract/mechanical rules (`CSS-*`, `SLIDE-*`, `SLIDES-*`) are rejected (verified with a negative case: a dead variable stays a hard failure even when listed)
- **31 reference-template themes declared** — waivers derived from each file's existing documented deviations; `themes/*.css` is now **58/58** green under `validate`
- **GitHub Actions CI** — `.github/workflows/ci.yml`: `npm ci` (Chrome download skipped) → build CLI + MCP → per-file theme validation → sample deck validation
- **Tags restored** — `v0.7.0` and `v0.7.1` created (the repo had stopped tagging at `v0.6.2`)

### 🎨 Fixed — `pink-script` readability

- **Link color `#ff66a8` → `#b3155a`** — the neon pink was used as body text color at 2.4:1 on the pink paper, making links and bold runs nearly unreadable; the darker shade reaches 5.8:1 on paper and 5.0:1 on panels, while neon pink stays on color blocks and diagram accents

### 📡 Changed — DSH host compatibility

- **Optional peer range narrowed to the 0.2.x line** — `@deepseek-ai/dsh-skill` now accepts every 0.2.x rc patch line (0.2.0–0.2.9) and nothing else (`^0.2.0-rc || … || ^0.2.9-rc`), so future 0.2.x rc releases need no further changes; 0.1.x and 0.3+ host lines are intentionally out of scope. Semver's prerelease rule forces one comparator per rc patch line; the runtime still consumes only the stable `BUNDLED_SKILL_RANK` constant

### 🔒 Fixed — MCP publish availability

- **MCP dependencies hoisted to root** — the published tarball only carries `mcp-server/dist/index.js` (bin auto-include), which imports `@modelcontextprotocol/sdk` and `zod`. Both were declared only in `mcp-server/package.json` (never packed), so an installed `colamd-themes-mcp` died with `Cannot find module`. Both are now root `dependencies`
- **Dead `list_mermaid_presets` tool and `mermaidPreset` argument removed** — the `mermaid-presets` command and `-m` option were deleted in the 2.7.7 Pele migration, but the MCP server still forwarded them, so every call failed. Zod schema, tool list, dispatch branch and the README tool table were updated (the table now also lists the 0.7.0 `ppt` / `to_slides` / `export_slides` / `check_pdf` tools)

### 🧹 Changed — repository hygiene

- **`.tmp-export/` untracked** — debug scripts removed from the git index and added to `.gitignore`
- **Selective `.trae/` ignore rules** — `rules/` and `skills/` are `build:skills` outputs that were ignored yet force-tracked, so every regeneration dirtied the tree; they are no longer ignored, while `documents/` stays local
- **`mcp-server` marked `private: true`, version aligned to 0.7.1** — the MCP server ships inside the root package (which already exposes the `colamd-themes-mcp` bin), so it needs no separate publish; the old 0.3.0 version had drifted from the main package

### 📦 Install

```bash
npm install @bytechain.cn/colamd-themes@0.7.1
```

## Version 0.7.0 (2026-11-22) — One-Shot PPT: Markdown → 16:9 Slide PDF 🎬

### 🎬 Added — One-shot deck generation & slide PDF export

- **`ppt <input.md>`** — one command does the whole job: source markdown → slide-deck markdown (`<input>.slides.md`) → directive/content contract → 16:9 PDF (`<input>.slides.pdf`) → PDF-01…05 content check. Any failing step short-circuits with an actionable reason. `--md-only` stops after the deck; `-t / -d / --deck-brand / --deck-title / --deck-meta / --deck-logo / --no-adapt` mirror the step-wise commands
- **`export-slides <deck.md>`** — export an existing deck using the platform's slide-sheet layout (requires `<!-- deck` or `<!-- slide:` directives; a non-deck input fails with a pointer to `to-slides` / `ppt`)
- **`exportSlidesPDF()`** — no longer goes through the semantic export DOM: it lays the live editor out on 1280×720 sheets via `enterSlidesPrintLayout` / `exitSlidesPrintLayout` (`preferCSSPageSize`, zero margins, print backgrounds) and keeps `--slide-*` tokens. The headless viewport is pinned to 1280×720 — with the default 800×600 viewport the cover title wrapped to three lines and every card page overflowed
- **Automatic sheet fitting** — before printing, each page's real height is measured; if any page exceeds one sheet the sheet type size is stepped down (up to 3 measure→scale passes, floor 0.6), so `PDF-03` (PDF pages = deck pages) holds and a page never spills onto a second sheet
- **Layout content contract & adaptation (`slides-markdown.ts`)** — `LAYOUT_CONTRACT` encodes item counts, list shape, row-title/number/date/figure/quote/two-column requirements for all 11 layouts. `markdownToSlides(..., { adapt })` (on by default; `--no-adapt` disables) adds `**row titles**`, downgrades kpi without numbers / timeline without dates to matrix, splits over-capacity lists into continuation pages (`label: 标题（续）`), splits oversized paragraphs at sentence boundaries, and gives a trailing quote its own page. `splitIntoPages` no longer lets the cover swallow the next h2 section
- **New rules SLIDES-07 / SLIDES-08** — layout/content mismatch (SHOULD) and estimated single-page overflow (SHOULD); `validate <deck.md>` reports both
- **Unified CLI invocation contract** — new `src/utils/output.ts`: one-line summaries by default, one-line `--json`, detail only with `--verbose`, failures print only failing items, and spinners are disabled for non-TTY/JSON. Wired into `to-slides` / `validate` / `export-*` / `check-pdf` / `ppt`
- **Platform capability probe** — `compat.ts` gains `slidesExportSupported` (inspects the lib bundle for `enterSlidesPrintLayout` / `exitSlidesPrintLayout`) and `SLIDES_EXPORT_MIN_VERSION`; the compat line now reports "PPT 导出: 支持/不支持" and old platforms get an upgrade command instead of a crash
- **MCP tools** — new `ppt`, `to_slides`, `export_slides`, `check_pdf`; all pass `--json` by default and are described as one-shot
- **SKILL.md unified invocation logic** — new Quick tasks table and Invocation rules (one command per task, no redundant `validate`, do not read artifacts back, stop on failure), regenerated into all 7 agent targets and `.trae/rules`

### 📦 Install

```bash
npm install @bytechain.cn/colamd-themes@0.7.0
```

Requires `@bytechain.cn/colamd@^2.7.13` whose lib entry exposes the slide export API.

## Version 0.6.2 (2026-11-17) — Export PDF Content Contract & Slide PDF Fidelity 📄

### 📄 Added — Export PDF content checks (PDF-01…05)

- **Artifact-side contract (`src/pdf-check.ts`)** — the CSS contract guards what goes INTO the renderer; the PDF contract guards what comes OUT. `export-pdf` now auto-runs a content check after every export and prints a report; a new `check-pdf <file.pdf> [-d <deck.md>]` command inspects any existing PDF standalone. Rules: **PDF-01** (MUST) the PDF parses with ≥1 page; **PDF-02** (MUST) page size consistent, and slide exports must be 16:9 paper (1280×720 @96dpi = 960×540pt); **PDF-03** (MUST) slide page count = deck page count (the most common fidelity failure is one overflowing page spilling onto two sheets); **PDF-04** (SHOULD) no blank pages (< 5 chars of page text); **PDF-05** (SHOULD) the deck title (chrome) appears in the PDF text (whitespace-stripped matching, immune to Chromium glyph-run splitting). MUST violations exit 1
- **pdf-parse must run in a clean `node -e` subprocess** — pdf.js v1.10's worker deterministically mis-reports `bad XRef entry` under tsx/esbuild module transforms on perfectly valid PDFs (including real Chromium exports) that plain `node` parses fine. The buffer goes over stdin, results come back as one JSON line on stdout, and the pdf-parse module path is resolved by the CLI via `createRequire` and passed through the environment
- **Deck introspection helpers** — `slides-markdown.ts` exports `countDeckPages()` and `extractDeckChrome()` (deck block logo/brand/title/meta, first-h1 fallback)
- **Contract docs synced** — SKILL.md gains the "Export PDF content checks (PDF-01…05)" section; `build:skills` regenerated all 7 agent targets and `.trae/rules`

### 🎨 Fixed — editorial-forest green-slide readability & export fidelity

- **Export-side invisible text (root cause)** — many `body.slides-printing` color rules lacked the `#editor .cm-content` id weight and were overridden by document rules (`.cm-md-strong{ink}` etc.), leaving ink text on the deep-green pages in PPT-PDF (1.77:1). All export inline selectors now carry the id weight (matching the pink-script-dark implementation conventions)
- **Presenting-side small text** — small pink-on-green text (#e89cb1, 4.61:1) switched to `--forest-pink-bright` #f6c9d6 (≥5.28:1): cover subtitle/lead, kicker, chrome/foot, KPI tag, timeline entry titles, closing list marks, agenda card 1. Large brand elements (220px cover title, KPI numbers) keep the accent (large-text 3:1 met)
- **Row-level color override (key fix)** — upstream sets colors directly on the layout line elements (kpi/timeline = `--text-secondary`, closing = `--text-muted`, page-lead = `--text-secondary`), and **a color set on the element always beats a color inherited from `.cm-content`** — so with colors only on the ancestor, the descriptions under KPI numbers / timeline years stayed dark grey on green (≈2.7:1). The theme now writes the color back onto the rows themselves (`.cm-md-slide-kpi.cm-md-li` etc., `#editor .cm-content` id weight): kpi/timeline descriptions = cream 88% (6.6:1), closing rows = brightened pink (5.28:1), figure and pink-page leads take their page's color. Verified with a Puppeteer computed-color probe: all 8 green-page text roles now ≥ 4.5:1
- **Per-page background fidelity on export** — upstream slides-export paints the whole sheet with a single body background (`!important`), so the old `body.slides-printing:has(...)` page recoloring lost the cascade and green/pink pages dropped their background. Backgrounds now paint at line level (every line carries `cm-md-slide-<layout>`), with ±77px negative margins restoring full bleed; vertical spacing on green pages converts margin → padding (margin areas don't receive the line background); leftover `~ *` sibling selectors replaced by direct line-class hits
- **New 1.7 export paper calibration** — 1280×720 @24px/em conversion: cover/section/closing/quote/title token overrides, list font-size calibration (26px-base → 0.667em, 30px-base → 0.833em, 32px-base → 0.89em), hardcoded kpi/figure/quote sizes converted, density block (line-height 1.62 / compressed empty lines / table & code), chrome/foot fixed-px scaling; the old ×0.88 double-shrink block removed

### 📦 Install

```bash
npm install @bytechain.cn/colamd-themes@0.6.2
```

## Version 0.6.1 (2026-11-16) — Local HTML Template Extraction & Full Slide Tokens 🎨

### 🎨 Added

- **`from-html <file>` extractor** — extract a theme from a local HTML file. The URL extractor's parsing core is refactored into a reusable protected `extractFromHtml()`, and a sibling `template.json` (when present) supplies authoritative metadata: slug/tagline as theme name/description, `typography.display/body/mono` + `serif_cn/sans_cn` as font stacks with CJK fallback and a trailing generic family (SLIDE-03). The `extract` auto-detect chain now recognizes local `.html/.htm` files too
- **Color extraction: semantic tokens + luminance/saturation heuristics** — colors come from the template's `:root` custom properties: exact semantic-name matches first (`--bg`/`--text`/`--accent`…), then substring variants (`--c-bg`/`--fg`/`--ink`…), then luminance-sorted background/foreground with the most saturated well-separated chroma as accent. `normalizeColor` now treats `var()` references as unknown (empty → paradigm defaults), so they can never reach downstream `hexToRgb`
- **Palette sanitizer** — after template colors override the paradigm defaults, invalid or wrongly-ordered derived colors are re-derived by linear interpolation: SL-04 luminance ordering (dark: surface < panel < panelAlt), CR-02 muted-text contrast ≥ 4.5:1 (preserving the foreground hue axis, NT-01), NT-02 border visibility
- **Full slide token derivation (`buildFullSlideTokens`)** — the `--slide-*` section grows from 0.6.0's brand voice (title font / mono / weight + preset overrides) to 24 per-layout tokens: cover/section/closing title ladder from the template's own display/body ratio, page title / KPI / quote / kicker / chrome / page padding derived from mood tags (bold/quiet/tech), density, formality and scheme. Design hints travel via `ThemeStyle.slideDesign` (`SlideDesignHints`); themes without hints degrade to the exact 0.6.0 output (fully backward compatible)
- **Auto slide-preset detection** — a valueless `--ppt` flag trusts the preset the extractor picked from the template's display font (serif names → serif, mono → mono, otherwise sans); an explicit `--ppt <style>` still overrides
- **34 themes from beautiful-html-templates** — batch-extracted from 34 slide-deck templates: 17 sans (Space Grotesk / Bebas Neue / Barlow families) + 17 serif (Cormorant / Bodoni Moda / Playfair families), all within the 300-line contract limit. Catalog with per-theme style notes: `themes/README.md`

### 🔧 Changed

- `UrlExtractor.parseCssRules` / `extractAllStyles` relaxed from private to protected (subclass reuse); `normalizeColor` recognizes `var(` prefixes (benefits network sources equally)
- The generator pipeline now calls `buildFullSlideTokens`; output is identical when `slideDesign` is absent

### Verified

- `tsc --noEmit` clean; batch extraction of all 34 templates with zero failures
- Full `validate` run: `:root` contract pass, platform compat `@bytechain.cn/colamd 2.7.13`, slide layouts supported
- Sample exports (vellum dark / coral mixed / 8-bit-orbit neon dark) render faithfully (vellum: `#2a3870` navy + `#e8d85c` warm yellow + `#3a7878` dusty teal)
- Highly saturated templates keep their intentional SL-01/SL-02 paradigm warnings by design (not contract errors)

### Upgrade

```bash
npm install @bytechain.cn/colamd-themes@0.6.1
```

---

## Version 0.6.0 (2026-11-16) — PPT Slide Layout Support (ColaMD 2.7.13) 🎞️

### 🎞️ Added

- **PPT style in themes (`--ppt`, off by default)** — `from-url` / `from-docx` / `from-pdf` / `extract` accept `--ppt [serif|sans|mono]` to emit a `--slide-*` token section (SECTION 1.5) into the generated theme. Presets mirror upstream voices: `serif` = magazine default, `sans` = Notion-like (sans titles, centered cover), `mono` = Writer-like (mono titles). Only the brand layer is derived (`--slide-title-font` / `--slide-mono` / `--slide-title-weight`, with CJK fallback + generic family ensured); the layout size ladder stays at upstream defaults. Custom theme CSS loads after upstream `slides.css`, so `:root` tokens win at equal specificity
- **Markdown → slide-deck Markdown (`to-slides`)** — `colamd-themes to-slides <input.md> -o <output.md>` (plus `--deck-brand/--deck-title/--deck-meta/--deck-logo`) splits a plain document into pages (upstream pagination semantics via `@lezer/markdown`) and infers all eleven built-in layouts from content structure, emitting deck chrome and per-page header blocks with chapter tracking. The output is self-checked against the directive contract before writing
- **Slide rule validation** — `validate` now accepts `.md` files and enforces the directive contract: page-first placement (SLIDES-01), layout-name syntax (SLIDES-02), unknown-layout warning (SLIDES-03), page/deck field-key whitelists (SLIDES-04/05), and the `slide-css` safety subset rejecting `position: absolute/fixed` / `z-index` / pseudo-protocol URLs (SLIDES-06). Theme-side slide rules: unknown `--slide-*` tokens (SLIDE-01), structure selectors must live under `body.presenting` / `body.slides-printing` (SLIDE-02), CJK+generic title font stacks (SLIDE-03)

### 🔧 Changed

- **Single-contract compat layer on 2.7.13** — exact contract match accepts only `2.7.13` (the stable slide layout release; its contract.json is identical to the previous anchor — no live/dead variable changes, themes carry over unchanged). `SUPPORTED_CONTRACT` / `MIN_RENDERER_VERSION` both point at `2.7.13`. New `slidesSupported` probe: version ≥ `2.7.13-rc.1` or rc.2-specific CSS markers; the platform compat line reports「幻灯片版式: 支持/不支持」
- **Theme audits fixed** — `indigo-deck` paper layers desaturated to the paradigm limits (SL-01/SL-02: surface/panel/panelAlt now on a single 210–213° axis within ≤5% / ≤10% saturation; the indigo identity moves to accent/highlight/Pele), and `swiss-lemon-dark` drops the vertical padding on code block edge lines (CSS-03). All 23 shipped themes now pass `validate` with zero issues
- New dependency `@lezer/markdown@^1` (same parser family as upstream). Skill + workspace rule files document the slide directive syntax, the 11 layouts, token presets, and all validation rules; regenerated for all 7 agent targets

### 📌 Scope notes

- Exports through `buildExportHTML` remain document-style (the upstream lib build keeps slide CSS out of `colamd.css` — in 2.7.13 it ships only in the renderer assets used by the app's presentation mode) — presentation layouts apply in the ColaMD app, and the compat probe points the way. `slide-js` generation is out of scope (documented syntax only)

### Upgrade

```bash
npm install @bytechain.cn/colamd-themes@0.6.0
```

---

## Version 0.5.9 (2026-11-14) — Ecosystem Guide & Downloads

### Documentation

- **ColaMD-extend introduction and desktop downloads** — both English and Chinese READMEs now introduce the upstream cross-platform desktop editor and rendering engine, with links to the project guide, official website, and latest desktop release
- **vscode-colaview introduction and extension installation** — the new ecosystem section covers ColaView MD's live Markdown preview, KaTeX/Mermaid rendering, HTML/PDF/Word export, setup steps, and Visual Studio Marketplace installation
- **Theme usage guidance** — generated CSS themes now have direct import instructions for both the ColaMD desktop app (**Theme → Import Theme**) and ColaView MD (**Import Custom Theme...** or the workspace `.themes/` directory)

This is a documentation-only release. The theme contract, shipped CSS themes, and export behavior are unchanged.

### Upgrade

```bash
npm install @bytechain.cn/colamd-themes@0.5.9
```

---

## Version 0.5.8 (2026-11-14) — Export Token Optimization & ColaMD 2.7.12 🚀

### 🛰 Platform — ColaMD 2.7.12

- **Contract anchor 2.7.11 → 2.7.12** — `SUPPORTED_CONTRACT` in [`src/compat.ts`](src/compat.ts), the CLI/validator labels, the generator/model/validator comments, and the DSH skill description now read **2.7.12**. Upstream has **no breaking contract change** — `themes/contract.json` only bumps its `contractVersion` string; the 27 live variables, 18 dead variables, `.cm-md-*` hooks, and the renderer API surface are unchanged. The dependency is bumped `@bytechain.cn/colamd@^2.7.11` → `^2.7.12` (now published on npm); `validate` reports「契约 2.7.12，与主题契约一致」. Upstream 2.7.12 changes (none touch the theme contract): Android file-open & single-document UX, todo-checkbox backspace behavior, theme border-color polish, formula/chart preview cross-line incremental update fix

### 🚀 Added

- **Export-artifact token optimization (default on)** — the bundled `colamd.css` inlines 20 KaTeX `@font-face` blocks (~96% of the CSS, ~1.5 MB / ~400k tokens) so math renders offline. When an AI/LLM agent reads an export back, that dead weight is pure token waste. `export-html` / `export-pdf` / `export` now post-process the artifact by default: when the source markdown contains **no** math (`$$`, `$...$`, `\(..\)`, `\begin{..}`), all `@font-face` blocks are stripped, shrinking a typical export to ~57 KB (~15k tokens) while keeping content and every other style rule intact (the browser falls back to system fonts). Math documents keep their fonts automatically; `--keep-fonts` forces full embedding on any export command
- **Precise math detection** — `markdownHasMath` only reacts to unambiguous math markers; money mentions like `$1.5M` / `$90 亿` stay single-`$` and don't trigger font retention
- **Batch multi-format rendering reuse** — `export ... --format html,pdf` accepts a comma-separated format list; the same markdown renders both HTML and PDF inside **one** renderer/browser lifecycle (previously two CLI startups, each cold-starting Chromium)

### 🔧 Changed

- `renderer.ts` `RenderInput` gains `optimize?: boolean` (default `true`); new `optimizeExportHtml` / `stripMathFonts` / `markdownHasMath` helpers
- Export CLI options table (README / README_CN / bundled skill) documents `--keep-fonts` and the multi-format batch syntax; skill regeneration switched to the cross-platform `skills/build-skills.js` launcher (`npm run build:skills`)

### ✅ Verified

- Plain no-math paper: HTML 1,520,498 B → 79,377 B (−94.8%), title/abstract/keywords/sections/bibliography all preserved, `@font-face` and base64 payloads at zero
- Math document (`$$...$$`): all 20 fonts kept by default (1.5 MB); `--keep-fonts` behaves identically
- Money document (`$1.5M`): fonts correctly stripped
- `batch --format html,pdf`: one init produces both HTML (88 KB) and PDF (1.1 MB / 6 pages A4)

### 📦 Upgrade

```bash
git pull && npm install && npm run build
```

---

## Version 0.5.7 (2026-11-12) — DSH Activation Fix 🔧

### 🔧 Fixed

- **DSH plugin failed to activate (`mammoth` static import)** — `dist/extractors/docx-extractor.js` statically imported `mammoth`, which ships only in `devDependencies` and is never installed into a DSH profile. The Harness imports the package root (`dist/index.js` → `docx-extractor.js`), so activation died with `ERR_MODULE_NOT_FOUND: Cannot find package 'mammoth'`. `docx-extractor.ts` now resolves mammoth lazily through `createRequire` with two anchors (package tree → `process.cwd()`): only `from-docx` needs it at call time, activation never touches it
- **0.5.6 artifact was stale** — the lazy-loading fix landed after the 0.5.6 build and was never rebuilt, version-bumped, or published, so npm still served the static-import dist. dist is rebuilt and published as 0.5.7

### ✅ Verified

- `import('./dist/index.js')` loads cleanly (`name` / `inject` / `apply` intact); a full dist scan finds no static mammoth import

### 📦 Upgrade

```bash
git pull && npm install && npm run build
```

In DSH, upgrade the `@bytechain.cn/colamd-themes` component to 0.5.7 (the profile install must be refreshed — the already-installed 0.5.6 keeps the broken dist).

---

## Version 0.5.6 (2026-11-11) — Cross-Platform build:skills 🔧

### 🔧 Fixed

- **`npm run build:skills` failed on Windows hosts without `bash` on PATH** — the npm script invoked `bash skills/build-skills.sh` directly, and npm scripts run via cmd.exe on Windows, so hosts relying on Git-bundled bash (not on PATH) failed with `'bash' is not recognized`. A cross-platform launcher, `skills/build-skills.js`, now locates bash in order: derive from `git` on PATH (`<Git root>\bin\bash.exe`), the Git for Windows registry key (`HKLM/HKCU\SOFTWARE\GitForWindows\InstallPath`), well-known install roots (Program Files / Program Files (x86) / LocalAppData), and finally plain `bash`. Arguments pass through (`npm run build:skills -- dsh`), stdio and exit codes are inherited, and non-Windows behavior is unchanged (plain `bash`). `package.json` now runs `node skills/build-skills.js`; the launcher ships inside the `files` whitelist (`skills/`)

### ✅ Verified

- Full run (all 7 agent targets) and single-target passthrough (`-- dsh`) both succeed on a Windows host with no `bash` on PATH; `npm pack --dry-run` bundle complete (91 files / 133 kB — `cordis.patch.yml`, `dist/dsh-plugin.js`, `skills/colamd-themes/SKILL.md`)

### 📦 Upgrade

```bash
git pull && npm install && npm run build
```

---

## Version 0.5.5 (2026-11-07) — ColaMD 2.7.11 & Export Fixes 🚀

### 🚀 Platform — ColaMD 2.7.11

- `@bytechain.cn/colamd` upgraded `^2.7.8` → `^2.7.11`; the contract anchor (`SUPPORTED_CONTRACT`), CLI/validator labels, and `.trae/rules` workspace rules now read **2.7.11**. Upstream has **no breaking contract change** — 27 live variables, `.cm-md-*` hooks, and the renderer API surface are unchanged (a new `cm-md-li` hook was added). `validate` reports `2.7.11（契约 2.7.11，与主题契约一致）`
- **Blockquote line background removed** — since 2.7.11 the editor paints the quote backdrop with `::before` + `--blockquote-bg` beneath the selection; a `background` on the `.cm-md-blockquote` line itself covers the code-block background of fenced code inside quotes. All 16 themes and both templates (`template.css` / `theme-template.hbs`) dropped the declaration; the export-side `.colamd-document blockquote` background is kept

### 🛠 Fixed — Export Pipeline

- **Blank printed HTML/PDF** — the platform's print stylesheet hides `body > :not(#editor-region)` (it targets the live app shell), while the standalone export places the document in `<article class="colamd-document">` directly under `<body>`: the PDF printed blank (954 bytes). `renderer.ts` now stamps the exported article with `id="colamd-export-document"` and injects a `@media print` override into the export HTML — HTML and PDF share the same artifact
- **Mermaid diagram background wrong in export** — Pele's SVG declares `--_bg: var(--pele-bg)` but never paints its own background: in the editor the diagram floats on the code-block line (`.cm-md-codeblock` backdrop), but 2.7.11's clean-html wraps it in a class-less `<div>` (the `cm-md-mermaid` class is dropped), leaving the diagram transparent over the page color. All 16 themes and both templates gained `.colamd-document svg.pele { background: var(--pele-bg); border-radius: var(--pele-radius); }` — the exact backdrop the editor uses

### ✅ Verified

- 16/16 themes pass `validate` with zero errors; elegant export HTML 1.54 MB (2 Mermaid SVGs, 49 `--pele-*` references intact); PDFs — elegant 6 pages / 903 KB, word-contract 6 pages / 795 KB (previously 954 blank bytes)

### 📦 Upgrade

```bash
git pull && npm install && npm run build
```

---

## Version 0.5.4 (2026-11-05) — Trae Skill Target 🎯

### 🎯 Added

- **Trae skill build target** — `skills/build-skills.sh` gains a `trae-skill` target (included in `all`) that generates `.trae/skills/colamd-themes/SKILL.md` from the same canonical source. The frontmatter follows Trae's project-skill constraints: `name` matches the directory name, and `description` is a single-line unquoted plain scalar with no `: ` or angle brackets (the router-visible trigger text). The existing `trae` target (`.trae/rules/colamd-themes.md` workspace rules) is unchanged — the two complement each other

---

## Version 0.5.3 (2026-11-02) — Platform Backward-Compatibility Hardening 🔧

### 🔧 Fixed

- **DSH 0.2.1-rc.5 compatibility** — the optional peer range for `@deepseek-ai/dsh-skill` is widened from `^0.1.5-rc.1` to `^0.1.5-rc.1 || ^0.2.0-rc || ^0.2.1-rc || ^0.3.0-rc || ^0.4.0-rc`. The 0.5.2 range could not match the dsh-skill shipped with the DSH 0.2.1-rc.5 runtime, so dsh-market's compatibility check rejected the plugin (advising uninstall/reinstall). Note: semver's prerelease rule forces per-patch enumeration, so new rc patch lines (e.g. 0.3.1-rc.x) need an appended comparator at release time
- **Windows path resolution bug** — `renderer.ts` (`findRendererPath`) and `cli.ts` (`findColamdCssPath`) built node_modules lookups from `new URL(import.meta.url).pathname`, which yields `/d:/...` on Windows so the module-relative candidate never matched. Both now use `fileURLToPath`
- **build-skills.sh CRLF truncation (0.5.2 regression)** — after the canonical `SKILL.md` gained CRLF line endings, `sed /^$/` could not match `\r` lines, so the extracted body was empty and all six generated agent skill files were silently truncated to bare frontmatter (~330 bytes) and shipped in 0.5.2. The script now strips CR before extraction and hard-fails on an empty body; all six files were regenerated, and the stale rendering-pipeline description in `SKILL.md` (PDF export must NOT use `emulateMediaType('screen')`) was corrected

### 🛡️ Added — Platform Compatibility Layer (`src/compat.ts`)

Upgrades to the ColaMD platform or the DSH runtime no longer surface as cryptic mid-render crashes or broken profile loads:

- **Contract drift detection** — reads the installed `@bytechain.cn/colamd` version and its machine-readable `themes/contract.json`, compares against the theme anchor contract (2.7.8-rc.2, 27 live variables), and reports missing live variables. Fully null-safe, never throws
- **Renderer API capability probe** — after editor init, the 4 methods the export pipeline calls (`applyTheme` / `setMarkdown` / `ensureAllPluginsRendered` / `buildExportHTML`) are verified; a future API drift fails fast with an error naming the installed version and the fix command
- **Non-fatal drift warnings** — export continues with a warning when the platform `contractVersion` differs; `cthemes validate` now prints a "平台兼容" report line so drift is caught at validation time
- **DSH host-entry fault tolerance** — `apply()` catches registration failures and degrades to a warning instead of crashing profile composition when the DSH skills service shape changes; the CLI bins are unaffected

### 📦 Compatibility policy

- `@bytechain.cn/colamd` stays `^2.7.8-rc.2`: caret auto-follows stable 2.x lines; pure prerelease lines (e.g. 2.8.0-rc.x) are opt-in. Drift after an upgrade is diagnosed by the compat layer at `validate`/export time
- `@deepseek-ai/dsh-skill` is an optional peer whose runtime surface is one stable constant (`BUNDLED_SKILL_RANK`) — worst case of a range mismatch is a market notice, never broken functionality

### 📦 Upgrade

Uninstall 0.5.2 from dsh-market, then reinstall `@bytechain.cn/colamd-themes@0.5.3` (or `dsh plugin --profile <name> add @bytechain.cn/colamd-themes`). Standalone `npm install` is unaffected.

---

## Version 0.5.2 (2026-11-01) — DSH Plugin & rc.2 🧩

### 🧩 dsh-market Plugin Support

The package is now a first-class **DSH (DeepSeek Harness) plugin bundle**:

- `package.json` declares `dsh.bundle.patch` → `cordis.patch.yml`, inserting the `colamd-themes` Cordis entry into the profile composition
- New host entry `src/dsh-plugin.ts` (`name` / `inject: ["skills"]` / `apply`) registers the bundled `skills/colamd-themes/SKILL.md` with the Harness `skills` service via `ctx.skills.registerProvider` — the same provider protocol as the built-in dsh-ppt plugin
- `colamd-themes` / `cthemes` CLI bins ship with the bundle and become available to profile agents after install
- `@deepseek-ai/dsh-skill` declared as an **optional peer** (`^0.1.5-rc.1`): dsh-market validates it against the DSH runtime version, standalone `npm install` is unaffected
- `files` whitelist (`dist` / `themes` / `skills` / `cordis.patch.yml`) keeps the published bundle lean; `dsh-plugin` keyword added

Verified: build passes, host-entry protocol simulated (`apply` → `list`/`get` return the bundled skill with valid locator), `npm pack --dry-run` bundle contents complete.

### 📦 Dependency

- `@bytechain.cn/colamd` upgraded to `^2.7.8-rc.2` (published on npm). rc.2 is the upstream Word-export & image-layout release; the theme contract is unchanged (27 live / 18 dead variables, `contractVersion` bump only). A real-export smoke test on rc.2 passed (`:root` carries exactly the 27 contract live variables, mermaid Pele SVG + KaTeX intact).
- All contract version labels across code, docs, and the six generated agent skills unified to **2.7.8-rc.2**.

### 📦 Upgrade

```bash
git pull && npm install && npm run build
```

---

## Version 0.5.1 (2026-10-25) — 2.x Renderer Switch

### ⚡ Export Pipeline on the 2.x Library Renderer

Upstream ColaMD-extend 2.7.8-rc.1 restored the `dist/lib/colamd-renderer.js` library entry (the P0 gap from the 2.7.7 audit). `renderer.ts` now runs fully on 2.x:

- Theme CSS is consumed directly as `:root` declarations — the 1.5.x `bridgeLegacyBodyVars()` body bridge, version detection, and branch logic are **removed (no backward compatibility with 1.5.x)**
- Titles pass through `buildExportHTML({ title })`; the regex fallback was deleted
- Dependency pinned to `^2.7.8-rc.1`

Verified by dual smoke tests: exports carry exactly the 27 contract live variables with zero dead-variable / `--seed-*` leakage, mermaid renders as Pele SVG with offline-resolvable `var(--pele-*)`, and block math exports as full KaTeX.

### 📦 Upgrade

`npm install` resolves the new dependency; theme files need no changes.

---

## Version 0.5.0 (2026-10-25) — ColaMD 2.7.7 Support 🎨

> **Verified against the published `@bytechain.cn/colamd@2.7.7` npm package**: all 16 themes are fully contract-compatible, and the design quality of 10 themes has been brought to zero paradigm errors.

### 🎨 Theme Quality Overhaul

**10 themes optimized to pass every paradigm rule (0 errors):**

| Theme | Fix |
|-------|-----|
| `colly` / `salvator-blog` / `meeting-minutes` | Panel hierarchy inverted → `--seed-panel-alt` deepened for a proper 2-step contrast |
| `swiss-design` | Border vs panel-alt lightness gap widened to 3 steps |
| `shimo-theme` | Panels now neutral grey; accent saturation raised to 83% (`#2a6bf2`) |
| `elegant` | Brick accent saturation 55% → 70% (`#b0401f`); hardcoded rgba values synced |
| `guizang` | Beige panels moved to neutral warm grey (fixes NT-02 hue drift) |
| `pixso-design` | Accent saturation 56% → 76% (`#4f46e5`); 6 gradients/borders migrated from `#6366f1` |
| `trae-blue` | Accent saturation 70% → 85% (`#2563eb`); panels neutralized |
| `forest-ink` | Accent saturation raised (`#356b44`); text greys re-tinted onto the ink-green hue axis |

Intentional warnings kept: the low-saturation scholarly accents of the academic trio, and meeting-minutes' pure-black accent (Swiss-minimal signature).

**Removed**: the legacy pre-2.7 theme (`body.theme-custom` root block, 58 dead variables, mojibake filename) — it had no effect under 2.7.7.

### ✅ 2.7.7 Compatibility Audit

Audited against the actual published npm package (`@bytechain.cn/colamd@2.7.7`):

- **Class hooks**: zero drift — every `.cm-md-*` class used by our themes exists among the 49 hooks in the 2.7.7 renderer CSS
- **Live variables**: the 14 core + 4 typography variables and all 9 `--pele-*` overrides are consumed by 2.7.7
- **Injection**: the 2.7.7 app appends custom theme CSS to `document.head` (`applyTheme`), so `:root` declarations cascade correctly
- **Contract version references** across the CLI, validators, and generator unified to 2.7.7

### 🛡️ Export Pipeline Guard

The npm `@bytechain.cn/colamd@2.7.7` package is the **Electron app distribution** — it no longer ships `dist/lib/colamd-renderer.js`, the library entry our HTML/PDF export pipeline needs. The CLI therefore keeps `@bytechain.cn/colamd@^1.5.2`, and `renderer.ts` now detects a 2.x install and fails with a clear downgrade instruction instead of a generic "Cannot find renderer" error.

Two related export fixes verified by smoke test:

- **Built-in theme resolution** — `-t elegant` previously let the 1.5.x renderer apply its own pre-2.7 built-in palette (`#c44b2b`); it now loads our `themes/elegant.css` (2.7.7 contract) first. Registered custom themes and direct `.css` paths were already correct.
- **Body-variable bridge** — the 1.5.x base CSS declares theme variables on `body`, overriding `:root` inheritance; the pipeline mirrors the theme's `:root` declarations onto `body` at injection time. Theme files themselves remain `:root`-only per the 2.7.7 contract.

> Theme files need no changes for the 2.7.7 app — import them via **Theme > Import Theme** or drop them into `~/.colamd/themes/`.
> Note: the app now ships its own built-in `elegant` theme; if you import our `elegant.css` into the app, consider renaming the file (e.g. `elegant-brick.css`) to avoid a name clash.

### 🔧 Housekeeping

- Fixed `package-lock.json` root manifest drift (`^2.0.0` → `^1.5.2`, matching `package.json`)
- Version bumped to **0.5.0**

### 📦 Upgrade

No breaking changes. Pull and rebuild:

```bash
git pull
npm install
npm run build
```

---


## Version 0.4.0 (2026-08-17) — DeepSeek Harness Integration 🤖

> **Multi-agent ecosystem update**: added DeepSeek Harness skill support and formalized 6-agent coverage.

### 🤖 AI Agent Update

**DeepSeek Harness Skill Support**
- Added `.dsh/skills/colamd-themes/SKILL.md` for DeepSeek Harness integration
- Build script now supports `bash skills/build-skills.sh dsh` target
- Consolidated multi-agent documentation across Claude Code, OpenCode, OpenClaw, Hermes, Trae, and DeepSeek Harness

### 🛠️ Improvements

- Standardized agent skill frontmatter with agent-specific metadata and command prerequisites
- Extended verification scripts (`DSH_SUPPORT_SUMMARY.md`, `test-dsh-skill.sh`)

---


## Version 0.3.3 (2026-08-26) — MCP Server & AI Agent Integration 🤖

> **AI ecosystem integration**: ColaMD-themes now connects to AI coding assistants via MCP protocol.
> **Chinese theme names now fully supported** — no more ASCII-only restriction.

### ✨ New Features

**MCP Server (Model Context Protocol)**
- Full MCP server implementation in `mcp-server/` directory
- 14 tools covering theme extraction, export, validation, and management
- Works with Chatbox, Cursor, Claude Desktop, Continue, and all MCP-compatible clients
- Quick setup via `npm run mcp` or configure in your MCP client settings

**Multi-Agent Skill Definitions**
- Added skill files for 5 AI coding agents:
  - Claude Code, OpenCode, OpenClaw, Hermes, Trae
- Auto-generated from `skills/colamd-themes/SKILL.md` via `build-skills.sh`

**Chinese Theme Name Support**
- Fixed CLI ASCII-only filter that stripped non-ASCII characters from theme names
- MCP server detects non-ASCII names and bypasses the filter using `-o` flag
- Tested with: `"我的主题"` -> `themes/我的主题.css` ✅

### 📦 Quick Start (MCP)

**Chatbox Configuration:**
```json
{
  "mcpServers": {
    "colamd-themes": {
      "command": "node",
      "args": ["D:/path/to/ColaMD-themes/mcp-server/dist/index.js"],
      "cwd": "D:/path/to/ColaMD-themes"
    }
  }
}
```

**Then in your chat:**
> "Extract a theme from https://example.com named 'My Theme'"

### 🛠️ MCP Tools Reference

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
| | `list_mermaid_presets` | 3 Mermaid presets — *(removed in 0.7.1; diagrams are drawn by Pele with `--pele-*` variables)* |
| Export | `export_html` | Markdown to HTML |
| | `export_pdf` | Markdown to PDF |
| | `export_batch` | Batch export |

### 🔧 Migration

**No breaking changes** — fully backward compatible.

**New scripts available:**
```bash
npm run build:mcp    # Build MCP server only
npm run build:all    # Build CLI + MCP server
npm run mcp          # Start MCP server
```

---

## Version 0.3.2 (2026-05-29) — Theme Authoring Guide 📝

> **AI agent skill enhancement**: Added comprehensive CSS pitfall quick reference for reliable theme generation.

### 📝 AI Agent Skill Update

**CSS Pitfall Quick Reference**
- Added 6-topic theme authoring guide to all AI agent skill definitions:
  1. **Screen & Print Sync** — every SECTION 5 rule must mirror in SECTION 6 `@media print`
  2. **Body Text First-Line Indent** — correct selector chain: `body.theme-custom p, body.theme-custom #write > p`
  3. **Indent Exclusion** — prevent indent pollution in lists, tables, mermaid blocks, blockquotes, and figures
  4. **List Indentation** — use `margin-left: 2em` instead of `padding-left`; include `#editor .ProseMirror` selectors
  5. **Mermaid CJK Text Overflow** — ≤ 2 lines per node, `fontSize: 14px`, simplified text
  6. **Mermaid classDef Inheritance** — must explicitly declare `fill / color / stroke`
- References `academic-paper.css` and `swiss-design.css` as canonical examples
- Skill files affected: `.claude/skills/`, `.opencode/skills/`, `.openclaw/skills/`, `.hermes/skills/`, `.trae/rules/`, `.dsh/skills/colamd-themes/SKILL.md`

### 🔧 Changes

- Consolidated all unreleased changes from v0.3.1 into this patch release
- Updated CHANGELOG and version links for the 0.3.2 release

---

## Version 0.3.1 (2026-06-01) — Security & Stability Patch 🔒

> **Important**: This release contains critical security fixes and important stability improvements.
> **All users are strongly recommended to upgrade.**

### 🚨 Critical Security Fixes

**SSRF Vulnerability Patch (CVE-Level)**
- **Issue**: URL extractor was vulnerable to Server-Side Request Forgery attacks
  - Attackers could force the server to access internal network resources
  - Could expose sensitive internal services or cause denial-of-service
- **Fix**: Implemented comprehensive URL validation in [`url-extractor.ts`](src/extractors/url-extractor.ts):
  - ✅ Protocol whitelist: Only `http:` and `https:` allowed
  - ✅ Private network blocking: localhost, 10.x, 172.16-31.x, 192.168.x, 169.254.x
  - ✅ Clear error messages for blocked attempts
- **Impact**: Prevents unauthorized internal network access; protects against SSRF attacks

**Input Validation Hardening**
- **Issue**: No validation on custom CSS theme files before processing
  - Large files could cause memory exhaustion (OOM)
  - Invalid file formats could crash the process
- **Fix**: Added multi-layer validation in [`theme-store.ts`](src/theme-store.ts):
  - ✅ File extension check (must be `.css`)
  - ✅ Size limit enforcement (1MB maximum)
  - ✅ Content validity verification (minimum 10 characters)
  - ✅ Sanitized filename extraction (removes special chars, limits length)
- **Impact**: Prevents OOM attacks; ensures graceful error handling

### 🐛 Major Bug Fixes

**PDF Export Theme Not Applied**
- **Symptom**: Custom themes were ignored when exporting to PDF; documents rendered with default styling only
- **Root Cause**: Puppeteer's `emulateMediaType("screen")` forced browser into screen mode, causing CSS `@media print { ... }` rules to be completely ignored
- **Fix**: Removed screen media type emulation in [`renderer.ts`](src/renderer.ts); allows default print mode where all `@media print` styles apply correctly
- **Result**: PDF exports now render with full theme fidelity — colors, fonts, backgrounds, spacing, and all visual styling correctly applied

**Puppeteer Resource Leak**
- **Symptom**: Zombie Chromium processes left running after export operations completed
- **Cause**: Page objects not explicitly closed before browser termination
- **Fix**: Explicit page cleanup in [`renderer.ts`](src/renderer.ts#L150-L155) close() method
- **Result**: Clean process shutdown; no resource leaks

**CLI Version Display Incorrect**
- **Symptom**: `colamd-themes --version` always showed "0.2.0" regardless of actual version
- **Cause**: Hardcoded version string in CLI initialization
- **Fix**: Dynamic version reading from [`package.json`](package.json) via [`getPackageVersion()`](src/cli.ts)
- **Result**: Accurate version display matching published package version

### ⚡ Performance Improvements

**Async I/O Migration**
- **Before**: Synchronous file operations (`readFileSync`, `writeFileSync`) blocked event loop during theme configuration
- **After**: All theme store operations now use async API (`fs/promises`)
- **Benefit**:
  - Non-blocking configuration reads/writes
  - Improved responsiveness during batch exports
  - Better scalability for concurrent operations
- **Files Updated**: [`theme-store.ts`](src/theme-store.ts)

**Template Cache Management**
- **Before**: Single global template variable; recompiled on every call after first use; no size limits
- **After**: Sophisticated cache system with three-layer invalidation:
  1. **LRU Eviction**: Maximum 10 cached templates (evicts oldest when full)
  2. **TTL Expiration**: Automatic expiry after 30 minutes of inactivity
  3. **mtime Detection**: Auto-invalidates when source template file is modified on disk
- **Benefit**:
  - ~90% reduction in template compilations for repeated operations
  - Stable memory usage in long-running processes
  - Fresh templates automatically loaded after updates
- **Files Updated**: [`generator.ts`](src/generator.ts)

### 🛠️ Code Quality Enhancements

**Unified Error Handling System**
- **New Module**: [`cli-utils.ts`](src/utils/cli-utils.ts)
- **Features**:
  - `CLIError` class: Structured errors with code, message, and cause chain
  - `ErrorCode` enum: Standardized categories (FILE_NOT_FOUND, THEME_ERROR, RENDER_ERROR, INVALID_INPUT, UNKNOWN)
  - Consistent error propagation across all commands
- **Impact**:
  - Better debugging experience with detailed error context
  - Consistent user-facing error messages
  - Easier error tracking and logging
  - Process exits with meaningful exit codes

**Code Deduplication**
- **Extracted Utilities**:
  - `resolveInputPath(input)`: Validates existence, converts relative→absolute paths
  - `resolveOutputPath(input, output?, ext?)`: Smart output path derivation
  - `getDocumentTitle(filePath)`: Extracts clean document title from path
- **Impact**:
  - Eliminated duplicate path resolution logic across 4+ command handlers
  - Single source of truth reduces maintenance burden
  - Consistent behavior across all export commands

### 📊 Metrics & Benchmarks

| Metric | v0.3.0 | v0.3.1 | Improvement |
|--------|--------|--------|-------------|
| **Security Vulnerabilities** | 2 Critical | 0 Known | ✅ Resolved |
| **Memory Usage (100 files)** | Unbounded | Stable | ✅ Predictable |
| **Template Compilations** | ~100 per batch | ~10 max | ⚡ 90% fewer |
| **Event Loop Blocking** | Frequent sync I/O | Minimal async ops | ⚡ Responsive |
| **Error Consistency** | Mixed patterns | Unified codes | ✅ Maintainable |
| **Zombie Processes** | Possible leak | Clean shutdown | ✅ Reliable |

### 🔧 Migration Guide

**For Most Users**: No action required! This is a drop-in replacement.

**Breaking Changes**: None — fully backward compatible.

**API Changes** (for programmatic usage):
```typescript
// Before (v0.3.0): Sync API
import { resolveTheme } from '@bytechain.cn/colamd-themes';
const theme = resolveTheme('elegant'); // Sync

// After (v0.3.1): Async API
import { resolveTheme } from '@bytechain.cn/colamd-themes';
const theme = await resolveTheme('elegant'); // Async
```

**New Error Handling** (recommended):
```typescript
import { CLIError, ErrorCode } from '@bytechain.cn/colamd-themes';

try {
  await exportHTML(document, { theme: 'custom' });
} catch (error) {
  if (error instanceof CLIError) {
    console.error(`Error ${error.code}: ${error.message}`);
    // Handle specific error types
    switch (error.code) {
      case ErrorCode.FILE_NOT_FOUND: /* ... */ break;
      case ErrorCode.THEME_ERROR: /* ... */ break;
      case ErrorCode.RENDER_ERROR: /* ... */ break;
      default: /* ... */ break;
    }
  }
}
```

### ✅ Testing Recommendations

After upgrading, verify these critical scenarios:

1. **Security Test**:
   ```bash
   # Should be blocked (private network)
   cthemes from-url "http://localhost:3000" --name test
   
   # Should be blocked (invalid protocol)
   cthemes from-url "ftp://example.com/file.css" --name test
   
   # Should work (public HTTPS)
   cthemes from-url "https://example.com" --name my-theme
   ```

2. **PDF Export Test**:
   ```bash
   # Verify themes now apply correctly
   cthemes export-pdf doc.md -t elegant -o test.pdf
   open test.pdf  # Check styling is applied
   ```

3. **Version Display Test**:
   ```bash
   # Should show 0.3.1
   cthemes --version
   ```

4. **Large File Protection Test**:
   ```bash
   # Create a large CSS file (>1MB)
   dd if=/dev/urandom of=large-theme.css bs=1024 count=1100
   
   # Should fail gracefully
   cthemes set-theme big --css large-theme.css
   ```

### 📝 Full Changelog

For complete details on all changes, see [CHANGELOG.md](./CHANGELOG.md).

---

## Version 0.3.0 (2026-06-01)

### 📦 Package Name Change

**Migrated to Scoped Package**
- Package name changed from `colamd-themes` to **`@bytechain.cn/colamd-themes`**
- Belongs to the `@bytechain.cn` organization ecosystem
- Consistent with dependency `@bytechain.cn/colamd`

**New Short CLI Command**
- Added `cthemes` as a short alias for `colamd-themes`
- Both commands are fully equivalent and interchangeable
- Recommended for frequent use: shorter to type, same functionality

### 🎨 New Themes

**Trae Blue Theme**
- Modern blue color scheme optimized for technical documentation
- Enhanced readability with carefully tuned contrast ratios
- Perfect for developer guides, API documentation, and code-heavy content

**Forest Ink Theme**
- Nature-inspired dark green palette with elegant ink aesthetics
- Sophisticated design suitable for long-form reading and literary content
- Unique visual identity that stands out from traditional themes

### ✨ Improvements

**Enhanced Swiss Design Theme**
- Refined typography with improved spacing and line heights
- Better color contrast for enhanced accessibility
- Polished overall visual appearance

**Better Developer Experience**
- **Absolute Path Support**: Use full file paths in all CLI commands — no more relative path confusion
  ```bash
  cthemes export-html /full/path/to/document.md -t elegant -o output.html
  ```
- **Interactive Previews**: New HTML preview files for colly and salvator-blog themes
- **Build Process**: Fixed template file copying to ensure reliable distributions

### 🧹 Housekeeping

- Removed system files (`.DS_Store`) from repository

---

## Version 0.2.0 (2026-05-25)

### 🚀 Major Upgrade: v3.0 Design System

**Complete Paradigm Overhaul**
- Implemented ColaMD's new v3.0 seed palette architecture
- **15 predefined palettes** across 5 color families:
  - Morandi (soft, muted tones)
  - Macaron (pastel, playful)
  - Nordic (cool, minimalist)
  - Vintage (warm, retro)
  - Mint (fresh, vibrant)
- **Auto-derived semantic mapping**: Design tokens automatically generate consistent color relationships
- **Mermaid Integration**: 3 diagram presets with 20 customizable variables *(removed in 0.7.1; Pele's 9 `--pele-*` variables take over)*

### 📚 Academic Focus

**New Academic Style Theme**
- Specialized formatting for research papers and scholarly documents
- Optimized typography for citations, references, and structured content
- Follows academic publishing conventions

**Redesigned Academic Paper Theme**
- Restructured to comply with v3.0 paradigm specifications
- Improved consistency with other themes in the ecosystem

### 🔧 Under the Hood

**Refactored Extractors**
- **URL Extractor**: Advanced CSS parsing with specificity-aware style resolution
- **DOCX Extractor**: Enhanced Word document style mapping via mammoth
- **PDF Extractor**: Multi-layer heuristic analysis for better metadata extraction
- **Auto-Detection**: Smarter source type identification

**Validation Engine**
- WCAG 2.1 compliance checking built-in
- 15+ design constraint rules with auto-fix suggestions
- Contrast ratio and luminance calculations

---

## Version 0.1.0 (2026-05-22) — Initial Release 🎉

### Core Features

**Theme Extraction from Any Source**
- **Web Pages**: Fetch URLs and extract CSS styling automatically
- **Word Documents**: Import `.docx` files and preserve document styles
- **PDF Files**: Analyze PDF typography and generate matching themes
- **Smart Detection**: Automatically identifies source type

**Professional Export Capabilities**
- **HTML Export**: Standalone documents with embedded themes
  - Full Mermaid diagram rendering
  - KaTeX math formula support
  - Responsive layout with print optimization
- **PDF Export**: High-quality PDF generation via Chromium
  - Pixel-perfect theme reproduction
  - Custom page formats (A4, Letter, etc.)
  - Batch processing for multiple files

**Complete Theme Management**
- Built-in theme library (light, dark, elegant, newsprint)
- Custom theme registration from CSS files
- Default theme configuration
- Easy switching between themes

**Developer-Friendly CLI**

```bash
# Extract theme from any source (use `colamd-themes` or short alias `cthemes`)
cthemes extract source.docx --name my-theme

# Export with beautiful styling
cthemes export-html doc.md -t elegant -o output.html
cthemes export-pdf doc.md -t dark --format A4 -o output.pdf

# Batch process entire directories
cthemes export docs/ --format pdf -t elegant -d output/

# Manage your themes
cthemes list
cthemes validate themes/my-theme.css
cthemes set-theme my-brand --css custom.css --default
```

### Technology Stack

- **TypeScript**: Type-safe implementation with full IDE support
- **css-tree**: Robust CSS parsing and analysis
- **mammoth**: Reliable DOCX processing
- **puppeteer**: Accurate PDF rendering
- **handlebars**: Flexible template engine
- **commander**: Intuitive CLI framework

### Perfect For

✅ Technical documentation teams needing consistent branding
✅ Content creators exporting Markdown to professional formats
✅ Developers building documentation pipelines
✅ Anyone wanting beautiful, themed Markdown output

---

## Quick Start

```bash
# Install
git clone https://github.com/byteuser1977/ColaMD-themes.git
cd ColaMD-themes
npm install
npm run build

# Try it out (use either command)
cthemes export-html README.md -t trae-blue -o preview.html
open preview.html
```

## Links

- **Documentation**: [README.md](./README.md)
- **Chinese Documentation**: [README_CN.md](./README_CN.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Issues**: [GitHub Issues](https://github.com/byteuser1977/ColaMD-themes/issues)
- **Contributing**: Pull requests welcome!

---

*Last updated: 2026-10-25*
