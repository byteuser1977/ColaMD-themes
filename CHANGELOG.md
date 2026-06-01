# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New theme: **Trae Blue** — modern blue-themed design for technical documentation
- New theme: **Forest Ink** — nature-inspired dark green palette with ink aesthetics
- Support for absolute path input in CLI commands
- Two new theme preview HTML files (colly-preview, salvator-blog-preview)
- CSS pitfall reference documentation

### Changed
- Optimized **Swiss Design** theme with improved typography and spacing
- Fixed build script template file copy logic (`package.json` build command)

### Removed
- `.DS_Store` files from project directory

---

## [0.3.0] - 2026-06-01

### Added
- **Trae Blue Theme**: Modern blue color scheme optimized for developer documentation and technical writing
- **Forest Ink Theme**: Dark forest-inspired theme with elegant ink-style aesthetics
- **Absolute Path Support**: CLI now accepts absolute file paths for all input commands
- **Theme Previews**: Added interactive HTML previews for colly and salvator-blog themes
- **CSS Reference**: Included common CSS pitfalls and best practices documentation

### Changed
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
  - Mermaid diagram presets (light/dark/elegant) with 20 core variables
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
  - Mermaid diagram integration
  - KaTeX math rendering support

---

[Unreleased]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/byteuser1977/ColaMD-themes/releases/tag/v0.1.0
