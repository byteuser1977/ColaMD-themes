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
