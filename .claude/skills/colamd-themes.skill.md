---
name: colamd-themes
description: >
  Generate ColaMD CSS theme files by extracting formatting from URLs,
  DOCX documents, or PDF files. Use when the user wants to create a
  ColaMD theme from a web page, Word document, or PDF.
---

# ColaMD Themes

Extract formatting from external sources and generate ColaMD-compatible CSS theme files.

## Supported Sources

- **Web Pages (URL)** — extracts colors, fonts, and layout from the page's CSS
- **Word Documents (.docx)** — extracts paragraph styles, fonts, and colors
- **PDF Documents (.pdf)** — extracts typography and text formatting

## Commands

### Extract from a URL
```bash
npx tsx src/cli.ts from-url <URL> --name <theme_name>
# or via npm link:
colamd-themes from-url <URL> --name <theme_name>
```

### Extract from a DOCX file
```bash
colamd-themes from-docx <file.docx> --name <theme_name>
```

### Extract from a PDF file
```bash
colamd-themes from-pdf <file.pdf> --name <theme_name>
```

### Auto-detect source type
```bash
colamd-themes extract <source> --name <theme_name>
```

### List generated themes
```bash
colamd-themes list
```

### Options
| Option | Description |
|--------|-------------|
| `-n, --name` | Theme name (default: derived from source) |
| `-o, --output` | Custom output CSS file path |
| `-d, --themes-dir` | Themes output directory (default: `themes/`) |

## Output

Generated CSS files are written to the `themes/` directory. Each file includes:
- Typora-compatible `:root` CSS variables
- ColaMD `body.theme-custom` CSS variables
- Full prose editor styles (headings, lists, tables, code blocks)
- Syntax highlighting token colors
- Mermaid diagram variables
- Math formula styles
- Scrollbar, selection, and source code mode styles
- Print and mobile responsive styles

## Constraints

- Run commands from the project root directory
- Node.js and npm must be available
- Install dependencies first: `npm install`
- Build before using: `npm run build`
- Or run directly with tsx: `npx tsx src/cli.ts <command>`
