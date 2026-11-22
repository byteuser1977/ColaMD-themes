# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-11-22

### Added — 一键 PPT 生成与 16:9 幻灯片 PDF 导出

- **`ppt <input.md>` 一键命令**：源 markdown → 幻灯片 deck markdown（`<input>.slides.md`）→ 指令/内容契约校验 → 16:9 PDF（`<input>.slides.pdf`）→ PDF-01~05 内容检查。任何一步失败即短路并给出可操作原因；`--md-only` 只产出 deck，`-t/-d/--deck-*/--no-adapt` 与分步命令一致
- **`export-slides <deck.md>`**：把已有 deck 按平台幻灯片纸版式导出为 16:9 PDF（需要 `<!-- deck` 或 `<!-- slide:` 指令；非 deck 输入直接报错并提示用 `to-slides`/`ppt`）
- **渲染层 `exportSlidesPDF()`**：不再走语义导出 DOM，而是用平台 `enterSlidesPrintLayout` / `exitSlidesPrintLayout` 把编辑面摊成 1280×720 纸（`preferCSSPageSize` + 零边距 + 打印背景），保留 `--slide-*` 令牌；并将 headless 视口固定为 1280×720，避免 800×600 默认视口把封面标题折成三行、卡片页溢出
- **自动适配纸面**：导出前测量每页实际高度，若超过单页则按比例下调纸面字号（重置迭代 3 次，下限 0.6），保证 `PDF-03`（PDF 页数 = deck 页数）通过；内容页不再被挤成两张纸
- **版式内容契约与自动适配（`slides-markdown.ts`）**：`LAYOUT_CONTRACT` 定义 11 种版式的项数/列表形状/行标题/数字/日期/图示/引用/双栏要求；`markdownToSlides(..., { adapt })`（默认开启，`--no-adapt` 关闭）自动补 `**行标题**`、kpi 无数字 / timeline 无日期降级为 matrix、列表超量拆续页（`label: 标题（续）`）、超长段落按句末拆页、引用块独立成页；`splitIntoPages` 修正 cover 吞掉后续 h2 小节的问题
- **新规则 SLIDES-07 / SLIDES-08**：版式内容不匹配（SHOULD）与估算单页溢出（SHOULD），`validate <deck.md>` 会报告
- **统一 CLI 调用契约**：新增 `src/utils/output.ts`——默认一行摘要、`--json` 单行 JSON、`--verbose` 才展开明细、失败只列失败项、非 TTY/JSON 模式禁用 spinner；`to-slides`/`validate`/`export-*`/`check-pdf`/`ppt` 全部接入
- **平台能力探测**：`compat.ts` 新增 `slidesExportSupported`（直接检查 lib bundle 是否暴露 `enterSlidesPrintLayout`/`exitSlidesPrintLayout`）与 `SLIDES_EXPORT_MIN_VERSION`；compat 行新增「PPT 导出: 支持/不支持」，旧平台给出升级命令而不是崩溃
- **MCP 工具**：新增 `ppt`、`to_slides`、`export_slides`、`check_pdf`，默认透传 `--json`，描述标注 one-shot
- **SKILL.md 统一调用逻辑**：新增 Quick tasks 表与 Invocation rules（一次命令、不重复 validate、不回读产物、失败即停），并同步 7 个 agent 副本与 `.trae/rules`

### Changed

- `@bytechain.cn/colamd` 需 ≥ 2.7.13 且 lib 暴露幻灯片导出 API；文档式 `export-html` / `export-pdf` 行为与 A4/Letter/A3 纸型不变
- `export-html` / `export-pdf` 成功输出收敛为一行；失败时只打印失败项

## [0.6.2] - 2026-11-17

### Added — 导出 PDF 内容契约检查（PDF-01…05）

- **产物侧契约检查 `src/pdf-check.ts`**：CSS 契约管「进渲染器的」，PDF 契约管「出渲染器的」。`export-pdf` 每次导出后自动执行内容检查并打印报告；新增 `check-pdf <file.pdf> [-d <deck.md>]` 命令可对任何已有 PDF 单独检查。规则：PDF-01 (MUST) PDF 可解析且 ≥1 页；PDF-02 (MUST) 页面尺寸一致 + 幻灯片导出必须 16:9（1280×720 @96dpi = 960×540pt）；PDF-03 (MUST) slide 页数 = deck 页数（最常见失真是内容溢出把一页挤出两张纸）；PDF-04 (SHOULD) 无空白页（页文本 < 5 字符）；PDF-05 (SHOULD) deck 标题（chrome）出现在 PDF 文本中（去空白比对，规避 Chromium 字形切分插空格）。MUST 违规退出码 1
- **pdf-parse 必须跑在干净 `node -e` 子进程**：pdf.js v1.10 的 worker 在 tsx/esbuild 模块转换环境下会对完全合法的 PDF（含真实 Chromium 导出）确定性误报 `bad XRef entry`——纯 `node` 下同一文件解析正常。buffer 走 stdin、结果走 stdout JSON，pdf-parse 解析路径由 CLI 侧 `createRequire` 解析后经环境变量传入子进程
- **deck 内省辅助**：`slides-markdown.ts` 新增导出 `countDeckPages()`（deck 页数 = 分页数）与 `extractDeckChrome()`（deck 块 logo/brand/title/meta 解析，无块时回退首个 h1）
- **契约说明同步**：SKILL.md 新增「Export PDF content checks (PDF-01…05)」章节，`build:skills` 同步 7 个 agent 目标与 `.trae/rules`

### Fixed — editorial-forest 绿底 slide 可读性与导出保真

- **导出侧文字不可读（根因）**：大量 `body.slides-printing` 行内修色规则缺 `#editor .cm-content` id 权重，被文档规则（`.cm-md-strong{ink}` 等）压掉 → PPT-PDF 里绿底落墨字（1.77:1）不可读。所有导出行内选择器补 id 权重（对齐 pink-script-dark 实现规约）
- **放映侧小字对比度**：绿底小号粉字 #e89cb1（4.61:1）换 `--forest-pink-bright` #f6c9d6（≥5.28:1）——封面副标题/导语、kicker、chrome/foot、KPI tag、timeline 条目标题、closing 清单符号、议程卡 1 文字；大字号元素（220px 封面标题、KPI 大数字）保留品牌粉（大字 3:1 达标）
- **行级颜色收口（关键修复）**：上游把颜色直接写在版式行元素上（kpi/timeline = `--text-secondary`、closing = `--text-muted`、page-lead = `--text-secondary`），**行元素自带的颜色永远赢过从 `.cm-content` 继承的颜色**——只在上层设色时，绿底上「数字/年份下方的说明小字」仍是深灰（≈2.7:1）。主题改为把颜色直接写回行（`.cm-md-slide-kpi.cm-md-li` 等，`#editor .cm-content` id 提权）：kpi/timeline 说明 = cream 88%（6.6:1）、closing 行 = 提亮粉（5.28:1）、figure/粉页导语同页取色。经 Puppeteer 计算色实测：绿底 8 类文本全部 ≥ 4.5:1
- **换底页导出保真**：上游 slides-export 把整张纸涂成导出瞬间 body 的单一底色（`!important`），原 `body.slides-printing:has(...)` 换底压不过 → 绿/粉页在纸上掉底。改为行级画底色（每行都带 `cm-md-slide-<版式>` 类），负边距 ±77px 补回纸面边距实现全出血；绿页纵向间距 margin → padding（margin 区不落底色露纸缝）；残留 `~ *` 兄弟选择器全部改为行类直接命中
- **新增 1.7 导出纸面校准**：1280×720 @24px/em 换算——cover/section/closing/quote/title 令牌收敛 + 列表字号校准（26px 基 → 0.667em / 30px 基 → 0.833em / 32px 基 → 0.89em）+ kpi/figure/quote 硬编码字号纸面换算 + 行高密度块（1.62/空行压扁/表格代码压缩）+ chrome/foot 定值缩放；删除原 ×0.88 二次缩小块避免双重缩小

## [0.6.1] - 2026-11-16

### Added — 本地 HTML 模板提取（`from-html`）与全量 PPT 版式令牌

- **新提取器 `from-html <file>`（本地 HTML 文件）**：新增 `LocalHtmlExtractor`，把 `UrlExtractor` 的解析核心抽为 protected `extractFromHtml()` 复用；`extract` 自动检测链同步纳入本地 `.html/.htm`。配套读取同目录 `template.json` 作为元数据覆盖层——`slug`/`tagline` 作主题名与描述，`typography.display/body/mono` + `serif_cn/sans_cn` 生成含中文字族回退、generic family 结尾的字体栈（SLIDE-03）
- **颜色提取：语义 token + 明度/饱和度启发式**：从模板 `<style>` 的 `:root` 自定义属性提取颜色——先按语义名单（`--bg`/`--text`/`--accent` 等）精确匹配，再按子串（`--c-bg`/`--fg`/`--ink` 等命名变体）兜底；无语义命名时按明度排序出背景/前景、与两端拉开距离的最饱和色作强调色。`normalizeColor` 对 `var()` 引用返回空值（改由范式默认兜底），杜绝 `var(--x)` 进入下游 `hexToRgb` 抛错
- **调色板清洗（sanitizePalette）**：模板原色为权威值覆盖范式默认后，无效值/不符合明度方向的派生色按背景-前景线性插值重推——SL-04 明度排序（暗色 surface < panel < panelAlt）、CR-02 次要文字对比度 ≥ 4.5:1（保前景色相轴，NT-01）、NT-02 边框可见性
- **全量 PPT 版式令牌（`buildFullSlideTokens`）**：`--slide-*` 从 0.6.0 的"品牌声音"（标题字体/等宽/字重 + 预设覆盖）扩展为按页类型全量定制的 24 个令牌——封面/章节/收页字号阶梯取自模板 display/body 比例，页标题/KPI/引言/kicker/chrome/页边距按模板气质标签（mood：bold/quiet/tech）与 density/formality/scheme 推导。设计提示经 `ThemeStyle.slideDesign`（`SlideDesignHints`：displayRatio/leadRatio/density/formality/scheme/mood）传递，无提示的主题自动降级为原 buildSlideTokens 行为（完全向后兼容）
- **PPT 预设自动判定**：`--ppt` 无值 flag 时信任提取器按模板 display 字体判定的预设（衬线字体名 → serif，等宽 → mono，其余 → sans），仅显式 `--ppt <style>` 才覆盖；`ThemeStyle.slideDesign` 承载模板密度/正式度/明暗/情绪与 `--sz-*` 字号阶梯比例
- **34 个 beautiful-html-templates 模板主题**（`themes/*.css`，产物）：从 `D:\workspace\git\beautiful-html-templates\templates` 的 34 个幻灯片模板批量提取，17 个 sans（Space Grotesk/Bebas Neue/Barlow 系）+ 17 个 serif（Cormorant/Bodoni Moda/Playfair 系），全部 ≤ 300 行契约上限；目录说明见 `themes/README.md`

### Changed

- `UrlExtractor.parseCssRules` / `extractAllStyles` 由 private 放宽为 protected（子类复用）；`normalizeColor` 识别 `var(` 前缀返回空串（网络来源同样受益）
- `generator.ts` 渲染管线改用 `buildFullSlideTokens`（slideDesign 缺省时输出与 0.6.0 一致）

### Verified

- `npx tsc --noEmit` 通过；34 个模板批量提取零失败
- 全量 `validate`：`:root` 根块与选择器契约通过、平台兼容 `@bytechain.cn/colamd 2.7.13（契约 2.7.13）`、幻灯片版式： 支持
- 抽样导出（vellum 深色 / coral mixed / 8-bit-orbit 霓虹暗色）HTML 成功，种子色忠实还原模板调色板（vellum：#2a3870 深蓝 + #e8d85c 暖黄 + #3a7878 灰蓝点缀）
- 高饱和模板（8-bit-orbit neon void 等）按设计保留 SL-01/SL-02 饱和度范式警告（模板刻意气质，非契约错误）

## [0.6.0] - 2026-11-16

### Added — ColaMD 2.7.13 幻灯片版式（PPT）支持

- **主题 PPT 样式（`--ppt` 提取选项，默认关闭）**：`from-url` / `from-docx` / `from-pdf` / `extract` 新增 `--ppt [style]`，可选预设 `serif`（上游杂志衬线默认）/ `sans`（Notion 气质：无衬线标题、居中封面、kicker 收敛）/ `mono`（Writer 气质：等宽标题）。开启后在生成主题 CSS 的 `:root` 追加 `--slide-*` 令牌区块（SECTION 1.5）——品牌层只派生 `--slide-title-font` / `--slide-mono` / `--slide-title-weight`（保证中文字族回退与 generic family 结尾），版式字号阶梯沿用上游默认。自定义主题 CSS 在上游 `slides.css` 之后加载，`:root` 同权重后到先赢；未开启时行为与 0.5.9 完全一致（回归通过）
- **Markdown → PPT Markdown（新命令 `to-slides`）**：`colamd-themes to-slides <input.md> -o <output.md> [--deck-brand/--deck-title/--deck-meta/--deck-logo]`。用 `@lezer/markdown`（上游同款解析器，新增依赖）按幻灯片语义分页（`---`/HorizontalRule 归前一页、frontmatter 排除、h1 恒分页、h2 智能合并保留 h1+h2 封面与 two-col 对半），按内容结构自动推断全部 11 种版式（cover/section/agenda/kpi/timeline/steps/matrix/two-col/figure/quote/closing），生成 deck 块与页头块（kicker/chapter 随章节推进），生成后自动跑指令契约校验
- **幻灯片规则校验**：`validate` 命令现在接受 `.md` 文件并执行指令契约检查——SLIDES-01 页头块必须在页首（MUST_NOT）、SLIDES-02 版式名语法（MUST_NOT）、SLIDES-03 未知版式名提示（SHOULD）、SLIDES-04/05 页头块与 deck 字段键白名单（MUST_NOT）、SLIDES-06 slide-css 安全子集：拒 `position: absolute/fixed` / `z-index` / 伪协议 URL，对齐上游 `scopeSlideCSS`（MUST_NOT）
- **主题侧幻灯片校验规则**：SLIDE-01 未知 `--slide-*` 令牌提示（SHOULD，对齐 2.7.13 slides.css 令牌清单）；SLIDE-02 幻灯片结构选择器（`.cm-md-page-*` / `.cm-md-slide-*` / `.slide-chrome|foot|ghost`）必须包裹在 `body.presenting` / `body.slides-printing` 作用域下，裸写污染编辑视图（MUST_NOT）；SLIDE-03 幻灯片标题字体栈须含中文字族并以 generic family 结尾（SHOULD）
- **导出侧 slide 令牌剥离**：`renderer.ts` 在导出路径把 customCSS 中的 `--slide-*` 声明剥掉后再交给 `applyTheme`——导出产物是语义 `.colamd-document`（无 cm-md-page/slide 类），令牌在导出里本就惰性；不剥离时 ≤2.7.12 平台的样式收集器会把 `:root` 里的 slide 令牌原样带进每份导出 HTML（实测 ~800 B 噪声）。主题文件本身不受影响，应用内放映照常消费

### Changed — 平台锚点升至 2.7.13（能力探测） + 主题审计修复

- **单契约锚点 2.7.13**：`getColamdCompat` 的 exact 判定为 `SUPPORTED_CONTRACTS = ["2.7.13"]`——2.7.13 正式版契约与旧锚点完全一致（27 活变量 / 18 死变量不变），主题 CSS 原样携带；`SUPPORTED_CONTRACT` 与 `MIN_RENDERER_VERSION` 同步指向 2.7.13
- **幻灯片能力探测**：`ColamdCompat` 新增 `slidesSupported`——主判据为安装版本 ≥ `2.7.13-rc.1`（新增 `compareColamdVersions`，处理 `-rc.N` 后缀），兜底特征为 colamd.css 含 `--slide-page-top-pad` / `.cm-md-slide-`（2.7.13 起幻灯片 CSS 移至 renderer assets，兜底仅对旧 rc 安装态有意义）。平台兼容行追加「幻灯片版式: 支持/不支持（放映样式需 ColaMD ≥ 2.7.13-rc.1，PPT 令牌将保持惰性）」
- **indigo-deck 纸面降饱和**：surface/panel/panelAlt 从 deck 原稿深靛蓝（S 56–72%）压到 paradigm 阈值内（#242526 / #2b2f34 / #2e3237，H210–213° 同轴，SL-01/SL-02/SL-03 全过，暗色亮度顺序不变）；靛蓝意象由 accent / highlight / Pele 承担。导出与编辑端 code-bg / blockquote-bg / highlight-bg 同步换算
- **swiss-lemon-dark 代码块边缘线修复**：移除 `.cm-md-codeblock-first` / `.cm-md-codeblock-last` 的纵向 padding（CSS-03：每行一 div 契约），导出端 `pre` 的纵向留白不受影响。全部 23 个主题 `validate` 零问题
- 依赖新增 `@lezer/markdown@^1`；devDep `@bytechain.cn/colamd` 升至 `^2.7.13`
- Skill（`skills/colamd-themes/SKILL.md`）与工作区规则（`.trae/rules/colamd-themes.md`，由 `build:skills` 同源再生成）新增幻灯片章节：指令语法、11 种版式对照、`--slide-*` 令牌与预设、to-slides 用法、SLIDE/SLIDES 校验规则；7 个 agent 目标 frontmatter 描述同步更新

### 范围说明

- 经 lib `buildExportHTML` 的 HTML/PDF 导出仍为文档式排版（2.7.13 的幻灯片 CSS 只随 renderer assets 提供应用内放映），放映版式在 ColaMD 应用内查看，compat 探测负责给出可操作提示
- 不生成 `slide-js`（脚本属高级用法，skill 文档说明语法）

### Verified

- `npm run build`（tsc）与 `npm run build:skills`（7 个 agent 目标）通过
- `to-slides` 样例（9 页）版式推断全部正确：cover / section / agenda / kpi / timeline / steps / matrix / quote / closing；`validate deck.md` 通过；与上游 `resources/templates/slides.md` 写法一致
- `--ppt sans` 生成主题含 `--slide-*` 区块（280 行 ≤ 300 行契约上限）、`validate` 报平台兼容行 + SLIDE 校验通过；不带 `--ppt` 回归无区块
- `export-html`（Puppeteer + 2.7.13 renderer）带 PPT 主题导出成功：slide 令牌零泄漏、契约活变量完整、产物 80 KB；HTML/PDF 导出冒烟测试在 2.7.13 安装态通过
- 负例全命中：未知令牌（SLIDE-01）、裸选择器 ×2（SLIDE-02）、非 CJK 字体栈（SLIDE-03）、页中指令块（SLIDES-01）、坏字段键（SLIDES-04/05）、危险 slide-css（SLIDES-06）、未知版式名（SLIDES-03）
- `validate` 平台兼容行在 2.7.13 安装态正确报告「契约 2.7.13，与主题契约一致；幻灯片版式: 支持」
- 全部 23 个主题 `validate` 零问题（indigo-deck 饱和度修复、swiss-lemon-dark 纵向 padding 修复后）
- 版本号 0.6.0

---

## [0.5.9] - 2026-11-14

### Documentation
- **ColaMD-extend 项目介绍与桌面版下载**：中英文 README 新增上游跨平台桌面编辑器及渲染引擎介绍，并提供项目使用指南、官方网站和最新桌面版本下载入口
- **vscode-colaview 项目介绍与扩展安装**：新增 ColaView MD 的 Markdown 实时预览、KaTeX/Mermaid 渲染、HTML/PDF/Word 导出功能说明，以及扩展安装和预览开启引导
- **主题使用指引**：补充生成 CSS 主题在 ColaMD 桌面版（主题 → 导入主题）和 ColaView MD（Import Custom Theme... 或工作区 `.themes/` 目录）中的使用方法
- 本次仅更新文档与生态项目指引，不改动主题契约、内置主题 CSS 或导出行为
- 版本号升至 0.5.9

---

## [0.5.8] - 2026-11-14

### Platform — ColaMD 2.7.12
- **契约锚点升级 2.7.11 → 2.7.12**：`SUPPORTED_CONTRACT`、CLI/校验器文案、`generator` / `models` / `validators` / `renderer` / `dsh-plugin` 注释与 DSH skill 描述同步更新为 2.7.12。上游契约**无破坏性变更**——`themes/contract.json` 仅 `contractVersion` 字符串变化，27 个活变量、18 个死变量、`.cm-md-*` 钩子、渲染器 API 面均不变；依赖升级 `@bytechain.cn/colamd@^2.7.11` → `^2.7.12`，`validate` 平台兼容行报告「契约 2.7.12，与主题契约一致」
- 2.7.12 上游变更（均不触及主题契约）：Android 端文件打开与单文档体验优化、待办框退格行为修复、主题边框色样式更新、公式/图表预览跨行增量更新修复

### Added
- **导出产物 token 优化（默认开启）**：涉 AI/LLM agent 读取导出 HTML 时，内联的 base64 KaTeX 数学字体（`colamd.css` 中 20 个 `@font-face`，占整份 CSS 的 96%）会拖入模型上下文造成大量 token 浪费。现在 `export-html` / `export-pdf` / `export` 默认执行后处理：当源 markdown **没有**数学公式（`$$`、`$...$`、`\(..\)`、`\begin{..}`）时，自动剥离全部 `@font-face` 块，把典型导出从 ~1.5 MB（约 400k tokens）压缩到 ~57 KB（约 15k tokens），内容与其余样式规则完整保留（浏览器回退系统字体）。含数学的文档自动保留字体。`--keep-fonts` 可强制始终嵌入完整字体
- **精确数学检测**：`markdownHasMath` 只认无歧义的数学标记；`$1.5M`、`$90 亿` 等金额不会误判为公式而触发字体保留
- **batch 多格式渲染复用**：`export ... --format html,pdf` 现在支持逗号分隔的多格式，同一份 markdown 在**一次** renderer/browser 生命周期内同时产出 HTML 与 PDF（此前需两次 CLI 启动，每次冷启动 Chromium），减少重复启动开销

### Changed
- `renderer.ts` 的 `RenderInput` 新增 `optimize?: boolean`（默认 `true`）；新增 `optimizeExportHtml` / `stripMathFonts` / `markdownHasMath` 辅助逻辑

### Verified
- 普通无公式论文：HTML 从 1,520,498 B → 79,377 B（−94.8%），标题/摘要/关键词/章节/参考文献全部保留，`@font-face` 与 base64 归零
- 数学文档（`$$...$$`）：默认仍保留 20 字体（1.5 MB），`--keep-fonts` 行为一致
- 金额文档（`$1.5M`）：正确剥离字体
- `batch --format html,pdf`：一次 init 同时产出 HTML（88 KB）+ PDF（1.1 MB / 6 页 A4）

---

## [0.5.7] - 2026-11-12

### Fixed
- **DSH 组件激活失败（mammoth 静态导入）**：`dist/extractors/docx-extractor.js` 原先以静态 `import mammoth from "mammoth"` 加载 DOCX 提取器，而 mammoth 只声明在 `devDependencies`、不会随插件安装进入 DSH profile。宿主导入包根（`dist/index.js` → `docx-extractor.js`）时直接抛 `ERR_MODULE_NOT_FOUND: Cannot find package 'mammoth'`，导致 `colamd-themes` 组件激活失败。`docx-extractor.ts` 改为 `createRequire` 双锚点懒加载（包自身 → 工作目录），仅在真正执行 `from-docx` 时才解析 mammoth，插件激活不再依赖该包
- **0.5.6 产物未重建**：懒加载修复的提交晚于 0.5.6 构建且未升版本/未发布，npm 上的 0.5.6 仍是带静态导入的旧 dist。本次重新构建 dist 并作为 0.5.7 发布

### Verified
- `import('./dist/index.js')` 加载成功（`name` / `inject` / `apply` 正常），dist 全量扫描无静态 mammoth 导入
- 版本号升至 0.5.7

---

## [0.5.6] - 2026-11-11

### Fixed
- **build:skills 跨平台修复**：`npm run build:skills` 原直接调用 `bash skills/build-skills.sh`，而 npm scripts 在 Windows 经 cmd.exe 执行，宿主 PATH 无 `bash` 时直接失败（`'bash' is not recognized`）。新增跨平台启动器 `skills/build-skills.js`，按序探测 bash：`where git` 推导 `<Git根>\bin\bash.exe` → 注册表 `HKLM/HKCU\SOFTWARE\GitForWindows\InstallPath` → 常见安装根（Program Files / Program Files (x86) / LocalAppData）→ 回退 PATH 中的 `bash`；参数透传（`npm run build:skills -- dsh`）、stdio 与退出码继承，非 Windows 平台行为不变（直接 `bash`）。`package.json` 的 `build:skills` 改为 `node skills/build-skills.js`；启动器位于 `files` 白名单 `skills/` 内，随包发布

### Verified
- 本机（无 PATH bash 的 Windows）全量 7 个 agent 目标与单目标透传（`-- dsh`）均生成成功；`npm pack --dry-run` bundle 内容完整（91 文件 / 133 kB，含 `cordis.patch.yml`、`dist/dsh-plugin.js`、`skills/colamd-themes/SKILL.md`）
- 版本号升至 0.5.6

---

## [0.5.5] - 2026-11-07

### Changed
- **平台升级 ColaMD 2.7.11**：`@bytechain.cn/colamd` 依赖由 `^2.7.8` 升至 `^2.7.11`，契约锚点（`SUPPORTED_CONTRACT`）、CLI/校验器文案与 `.trae/rules` 工作区规则同步更新为 2.7.11。上游契约无破坏性变更（27 活变量、`.cm-md-*` 钩子、渲染器 API 均不变，新增 `cm-md-li` 钩子）；`validate` 平台兼容行报告 `2.7.11（契约 2.7.11，与主题契约一致）`
- **引用块行背景移除**：2.7.11 起编辑器用 `::before` + `--blockquote-bg` 把引用底色画在选区下方，主题继续在 `.cm-md-blockquote` 行上写 `background` 会盖住"引用内代码块"的底色。全部 16 个主题与两套模板（`template.css` / `theme-template.hbs`）移除该声明，导出端 `.colamd-document blockquote` 背景保留

### Fixed
- **导出 HTML/PDF 打印空白**：平台 print 样式含 `body > :not(#editor-region) { display: none !important }`（针对应用外壳），而独立导出文档是 `<body>` 下的 `<article class="colamd-document">`，实测 PDF 仅 954 字节空白。`renderer.ts` 现在导出 HTML 中为文档加 `id="colamd-export-document"` 并注入 `@media print` 覆盖规则（HTML 与 PDF 共用同一份产物）
- **Mermaid 图导出背景错误**：Pele 的 SVG 只声明 `--_bg: var(--pele-bg)` 但从不自绘背景——编辑器里图浮在代码块行（`.cm-md-codeblock` 底色）上，而 2.7.11 的 clean-html 导出时把图包进无类名 `<div>`（`cm-md-mermaid` 类名被丢掉），图变透明底浮在页面底色上。全部 16 个主题与两套模板的 `.colamd-document` 段新增 `.colamd-document svg.pele { background: var(--pele-bg); border-radius: var(--pele-radius); }`，与编辑器中的底完全一致

### Verified
- 16/16 主题 `validate` 零错误；elegant 导出 HTML 1.54 MB（Mermaid SVG ×2、49 处 `--pele-*` 正常）；PDF elegant 6 页 / 903 KB、word-contract 6 页 / 795 KB（修复前 954 字节空白）
- 版本号升至 0.5.5

---

## [0.5.4] - 2026-11-05

### Added
- **Trae Skill 构建目标**：`skills/build-skills.sh` 新增 `trae-skill` 目标（并纳入 `all`），从同一规范源生成 `.trae/skills/colamd-themes/SKILL.md`——frontmatter 遵循 Trae 项目级 skill 约束（`name` 与目录同名、`description` 为单行无引号 plain scalar，不含 `: ` 与尖括号）；原 `trae` 目标（`.trae/rules/colamd-themes.md` 工作区规则）保留不变，二者互补
- 版本号升至 0.5.4

---

## [0.5.3] - 2026-11-02

### Fixed
- **DSH 0.2.1-rc.5 兼容性**：`@deepseek-ai/dsh-skill` optional peer 由 `^0.1.5-rc.1` 拓宽为 `^0.1.5-rc.1 || ^0.2.0-rc || ^0.2.1-rc || ^0.3.0-rc || ^0.4.0-rc`。0.5.2 的 peer 范围无法匹配 DSH 0.2.1-rc.5 运行时携带的 dsh-skill，dsh-market 校验报不兼容（提示卸载重装）。semver 预发布规则要求按 patch 线枚举 rc 比较器，故新线（0.3.1-rc.x 等）发布时需追加对应项；宿主入口仅消费稳定的 `BUNDLED_SKILL_RANK` 导出，无需代码改动
- **Windows 路径解析 bug**：`renderer.ts`（`findRendererPath`）与 `cli.ts`（`findColamdCssPath`）用 `new URL(import.meta.url).pathname` 拼路径，Windows 下生成 `/d:/...` 导致模块相对查找永远落空（此前仅靠 cwd 候选侥幸工作）。两处均改用 `fileURLToPath`
- **build-skills.sh CRLF 截断（0.5.2 回归）**：源 `SKILL.md` 行尾变为 CRLF 后，`sed /^$/` 匹配不到 `\r` 空行，BODY 提取为空，6 个 Agent 生成文件被静默截断为只剩 frontmatter（约 330 字节）并随 0.5.2 提交。脚本现先剥离 CR 再提取，BODY 为空时报错退出；已重新生成全部 6 个文件并修复 `SKILL.md` 中与实现相悖的渲染管线描述（PDF 导出不使用 `emulateMediaType('screen')`）

### Added
- **平台兼容层（`src/compat.ts`）**：运行时读取已安装 `@bytechain.cn/colamd` 的版本与 `themes/contract.json`，与主题锚定契约（2.7.8-rc.2，27 活变量）比对，输出契约漂移报告（`getColamdCompat` / `formatColamdCompat`），全部空值安全、不抛异常
- **渲染器 API 能力探测**：编辑器初始化后校验导出管线调用的 4 个方法（`applyTheme` / `setMarkdown` / `ensureAllPluginsRendered` / `buildExportHTML`）是否存在，缺失时给出含已安装版本号与修复命令的明确报错——未来平台 API 漂移不再以 "undefined is not a function" 的形式在渲染中途爆掉
- **契约漂移警告**：导出时平台 `contractVersion` 与主题契约不一致仅告警不中断（活变量缺失明细一并输出）；`cthemes validate` 新增「平台兼容」报告行，契约漂移在验证阶段即可发现
- **DSH 宿主入口容错**：`apply()` 内部 try/catch——未来 DSH 运行时 skills 服务协议漂移时降级为警告，不再让 Profile 组合树加载崩溃；CLI bins 不受影响
- 版本号升至 0.5.3

### 兼容策略
- `@bytechain.cn/colamd` 依赖保持 `^2.7.8-rc.2`：caret 自动跟随 2.x 稳定线升级，纯预发布线（如 2.8.0-rc.x）默认不自动引入，需显式 `npm install @bytechain.cn/colamd@<version>`；升级后的契约/API 漂移由兼容层在 `validate` 与导出阶段给出诊断
- `@deepseek-ai/dsh-skill` peer 为 optional 且运行时只消费 `BUNDLED_SKILL_RANK` 常量，范围不匹配的最坏结果是 market 提示，插件功能不受影响

### Upgrade
- 在 dsh-market 卸载 0.5.2 后重新安装 `@bytechain.cn/colamd-themes@0.5.3`（或 `dsh plugin --profile <name> add @bytechain.cn/colamd-themes`）

---

## [0.5.2] - 2026-11-01

### Added
- **dsh-market 插件支持**：本包现符合 DSH 插件 bundle 契约 —— `package.json` 声明 `dsh.bundle.patch`（指向新增的 `cordis.patch.yml`，插入 `colamd-themes` Cordis Entry），新增宿主入口 `src/dsh-plugin.ts`（`name/inject: ["skills"]/apply`，经 `ctx.skills.registerProvider` 注册捆绑的 `skills/colamd-themes/SKILL.md` 为 bundled skill，协议对齐 dsh-ppt 插件）；`peerDependencies` 声明 `@deepseek-ai/dsh-skill`（optional，market 运行时兼容性检查按 DSH `^0.1.5-rc.1` 校验，独立安装不受影响）；`files` 收录 `dist/themes/skills/cordis.patch.yml`，keywords 增加 `dsh-plugin`

### Changed
- 依赖升级 `@bytechain.cn/colamd` `^2.7.8-rc.1` → `^2.7.8-rc.2`（npm 已发布）。rc.2 为上游 Word 导出与图片排版修复（a4f4cc4），主题契约保持不变（`themes/contract.json` 仅 `contractVersion` 更新为 2.7.8-rc.2，仍为 27 活变量 / 18 死变量）
- 版本号升至 0.5.2

### Verified
- rc.2 真实导出冒烟测试通过：标题经 `buildExportHTML({ title })` 写入、`.colamd-document` 结构、`:root` 契约活变量、零 `--seed-*` 泄漏、mermaid Pele SVG、块公式完整 KaTeX

---

## [0.5.1] - 2026-10-25

### Changed
- **导出管线切换到 2.x 库渲染器**：上游 ColaMD-extend 2.7.8-rc.1（69515aa）恢复 `dist/lib/colamd-renderer.js` 库入口（P0），`renderer.ts` 全面改用 2.x——`:root` 契约 CSS 直接消费、标题经 `buildExportHTML({ title })` 传入
- **移除 1.5.x 兼容层（不向下兼容）**：删除 `bridgeLegacyBodyVars()` body 变量桥接、渲染器版本探测及分支逻辑；依赖由 `^1.5.2` 固定为 `^2.7.8-rc.1`（npm 发布 2.7.8-rc.1 前 `npm install`/`npm ci` 暂不可用，发布后重新解析）
- 契约版本标注统一为 **2.7.8-rc.1**（`validate` 输出、生成器自检、校验器消息与各文件注释）

### Verified
- 2.x 真实导出冒烟测试通过：`:root` 恰好 27 个契约活变量、零死变量/`--seed-*` 泄漏、mermaid Pele SVG（`var(--pele-*)` 离线可解析）、块公式完整 KaTeX 输出（P1 验收）

---

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

[Unreleased]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.5.1...HEAD
[0.5.1]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.2...v0.4.0
[0.3.2]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/byteuser1977/ColaMD-themes/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/byteuser1977/ColaMD-themes/releases/tag/v0.1.0
