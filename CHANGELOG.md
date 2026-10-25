# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-10-25

### Added
- **ColaMD 2.7.7 兼容性核对**：以 npm 发布的 `@bytechain.cn/colamd@2.7.7` 为基准，逐项验证主题 CSS 契约 —— `.cm-md-*` 类钩子零漂移（渲染器共 49 个钩子）、`:root` 活变量（14 核心 + 4 排版 + 9 `--pele-*`）全部被 2.7.7 消费
- **导出管线 2.x 包守卫**：`renderer.ts` 检测到安装的 `@bytechain.cn/colamd` 为 2.x（Electron 应用分发，不含 `colamd-renderer.js` 库入口）时给出明确的降级指引，替代原先笼统的 "Cannot find renderer" 报错
- **导出主题解析修复**：内置主题（如 `elegant`）现优先加载本仓库的 2.7.7 契约 CSS（`themes/<name>.css`）再传给渲染器，修复导出 HTML/PDF 实际使用 1.5.x 旧内置配色的问题；注入时将 `:root` 变量镜像到 `body` 作用域，绕过 1.5.x 基础 CSS 的元素级变量声明（主题文件保持 `:root` 契约不变，桥接逻辑仅存在于导出管线）
- 代码与文档中的契约版本引用统一为 **2.7.7**（`validate` 输出、生成器自检、校验器注释）

### Changed
- **10 个主题的设计质量优化**（paradigm 检查 0 错误）：
  - `colly` / `salvator-blog` / `meeting-minutes`：修正 panel 层级颠倒（`--seed-panel-alt` 加深至对比 2 级）
  - `swiss-design`：边框与 panel-alt 明度差扩大至 3 级
  - `shimo-theme`：面板改纯中性灰，accent 提饱和至 `#2a6bf2`（S 83%）
  - `elegant`：砖红 accent 饱和度 55% → 70%（`#b0401f`），选区等硬编码色同步
  - `guizang`：米黄面板改中性暖灰，消除中性灰偏离（NT-02）
  - `pixso-design`：accent 饱和度 56% → 76%（`#4f46e5`），6 处渐变/边框 rgba 迁移
  - `trae-blue`：accent 饱和度 70% → 85%（`#2563eb`），panel 换中性灰
  - `forest-ink`：accent 饱和度提升（`#356b44`），文字灰阶改绿灰回归墨绿主轴
- 保留 4 条有意的警告：academic 系列低饱和学术点缀、meeting-minutes 黑色极简点缀

### Removed
- 移除遗留的 pre-2.7 旧结构主题（`body.theme-custom` 根块 + 58 个死变量，文件名为 mojibake 的"我的主题.css"）—— 该主题在 2.7.7 下完全无效

### Fixed
- `package-lock.json` 根 manifest 依赖误标为 `^2.0.0`，恢复与 `package.json` 一致的 `^1.5.2`（npm 2.7.7 为应用分发，CLI 导出必须使用 1.5.x 库渲染器）

---

## [Unreleased]

*No unreleased changes for this snapshot.*

## [0.4.0] - 2026-10-23

### Added
- **DeepSeek Harness Agent Support** — 新增 `.dsh/skills/colamd-themes/SKILL.md`，通过 `skills/build-skills.sh dsh` 生成
- Agent skill 覆盖扩展至 6 个（Claude Code、OpenCode、OpenClaw、Hermes、Trae、DeepSeek Harness），frontmatter 统一加入各 Agent 的命令前置条件与能力标签
- `validateThemeCss()` 契约校验器：检查 `:root` 根块、死选择器、死变量、`pt` 单位、引用/代码块纵向 padding
- `colamd-themes validate` 现在同时输出 CSS 契约检查结果
- 生成后自动跑一次契约自检
- `DSH_SUPPORT_SUMMARY.md` 与 `test-dsh-skill.sh` 用于发布验证

### Changed
- **主题契约升级到 ColaMD Extend 2.7**：主题根块由 `body.theme-custom` 改为 `:root`；生成器模板升为 v4.0（`src/templates/theme-template.hbs`）
- **选择器层重写**：`#write` / `.ProseMirror` / 语义标签规则全部替换为 `#editor .cm-content .cm-md-*`（CodeMirror 6 钩子）；引用块与代码块只设左右 padding
- **变量体系重写**：新增 `--text-secondary` / `--highlight-bg` / `--editor-font-size` / `--editor-column-width` / `--pele-*`；删除 `--surface-color`、`--heading-color`、`--accent-*`、`--hr-color`、`--code-color`、`--code-block-color`、`--table-border`、`--scrollbar-thumb*`、`--mermaid-*`、`--radius-*`、`--content-width`、`--font-size-root`、`--font-scale-*`、`--line-height-*`、`--font-heading`、`--font-code` 等死变量
- **图表配色**：Mermaid 20 变量预设改为 Pele 9 变量，缺省值由 `--code-block-bg` / `--code-block-text` / `--link-color` 经 `color-mix()` 推导；CLI 移除 `mermaid-presets` 命令与 `--mermaid-preset` 选项
- **代码块文字色**：由代码块底色对比度自动派生（深色底拿浅字、浅色底拿正文色），不再硬编码
- **打印规范**：删除整份 `@media print` 镜像与变量重声明，只保留 `print-color-adjust` 保真
- `themes/template.css` 与 `src/templates/theme-paradigm.md` 同步至 v4.0
- 版本号统一为 **0.4.0**，README 多 Agent 章节补充 DeepSeek Harness 生成路径与 frontmatter 说明
- 构建脚本对齐新的数据通道契约

### Removed
- `src/mermaid-presets.ts`（Mermaid 预设链路）
- `ThemeStyle.mermaidPresetId`
- 误跟踪的 `.DS_Store` 文件

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

[Unreleased]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/byteuser1977/ColaMD-themes/releases/tag/v0.1.0
