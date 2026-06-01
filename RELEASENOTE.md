# Release Notes

## Version 0.3.0 (2026-06-01)

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
  colamd-themes export-html /full/path/to/document.md -t elegant -o output.html
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
- **Mermaid Integration**: 3 diagram presets with 20 customizable variables

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
# Extract theme from any source
colamd-themes extract source.docx --name my-theme

# Export with beautiful styling
colamd-themes export-html doc.md -t elegant -o output.html
colamd-themes export-pdf doc.md -t dark --format A4 -o output.pdf

# Batch process entire directories
colamd-themes export docs/ --format pdf -t elegant -d output/

# Manage your themes
colamd-themes list
colamd-themes validate themes/my-theme.css
colamd-themes set-theme my-brand --css custom.css --default
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

# Try it out
colamd-themes export-html README.md -t trae-blue -o preview.html
open preview.html
```

## Links

- **Documentation**: [README.md](./README.md)
- **Chinese Documentation**: [README_CN.md](./README_CN.md)
- **Issues**: [GitHub Issues](https://github.com/byteuser1977/ColaMD-themes/issues)
- **Contributing**: Pull requests welcome!

---

*Last updated: 2026-06-01*
