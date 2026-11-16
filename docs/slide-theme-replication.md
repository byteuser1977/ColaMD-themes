# 模板 → ColaMD 主题"逐页版式复刻"处理规则

> 来源：pink-script-dark / pin-and-paper / biennale-yellow 三个主题的精修实践，
> 以及后续 34 个模板批量精修（含 daisy-days 用户指定映射覆盖）的复盘。
> 适用：对 `beautiful-html-templates/templates/<slug>/template.html` 类多页 PPT 模板，
> 把每页视觉严格还原进 ColaMD 2.7.13 主题 CSS（幻灯片版式）。

## 1. 产物与结构

- 产物：`themes/<slug>.css`（手工精修版，可与工具生成版并存互不覆盖）
- 结构：
  - 文件头：来源、色板、字体、**paradigm 备案**（见 §7）、映射总表
  - `:root` 单块：1.1 seed 色板 → 1.2 语义色 → 1.3 排版 → 1.4 Pele → 1.5 `--slide-*` 令牌
  - SECTION 1.6：按版式的页面级复刻规则（全部 SLIDE-02 作用域）
  - SECTION 2 编辑器 DOM / SECTION 3 导出 HTML（两份镜像）/ SECTION 4 print

## 2. 流程（七步）

1. **读模板**：`:root` token（颜色/字体/字号）、8 个页面 section 的类名与 CSS
   （每页的背景、标题、子标题、正文、对象框的位置/字号/字色）。
2. **页面映射**：给每个模板页定 ColaMD 版式（见 §3）；写进 1.5 注释对照表。
3. **文档层修复**：修生成版提取缺陷（强调色不可见、标题阶梯爆字号/字重错、
   语义色重复、圆角体系、blockquote 轨道粗细），编辑器与导出两份镜像同步。
4. **令牌**：重写 1.5 `--slide-*`（字号阶梯按 §4 换算，写换算式注释）。
5. **SECTION 1.6**：逐版式 scoped 规则（1.6.1 页标题声部对齐 → 1.6.2+ 各版式 →
   最后 chrome；整页垂直居中单列一节，见 §6-10）。全部选择器用 `body.presenting`
   或 `body.slides-printing` 包裹（SLIDE-02）。
6. **校验**：`npx tsx src/cli.ts validate themes/<slug>.css`。契约/SLIDE/CSS-03 必须 0 违规；
   范式项按 §7 判"修复 or 备案"。
7. **header 备案**：把保留的范式项写进文件头，注明"与 <参考主题> 同类，有意保留"。

## 3. 页面映射规则

- 角色判定（上游页面角色 = Markdown 结构）：
  - 首页巨标题 → `cover`；章节分隔（短标题+说明）→ `section`；
  - 行式/有序清单（序号+行题+说明）→ `agenda`；日期行清单 → `timeline`；
  - 大数字统计 → `kpi`；金句+署名 → `quote`；末页行动清单/落款列 → `closing`；
  - 图/表/mermaid 主体 → `figure`；步骤流 → `steps`；卡片网格 → `matrix`。
- clamp 字号取 **1920×1080 实际落点**（如 `min(11vw,18vh)` @1920 = min(211,194)px）。
- 同形页（如 manifesto 与 quote spread）取结构最贴的一个做参照，另一个注释"同形不单列"。
- **用户指定映射优先**：用户点名"某版式 ← 第 N 页"时以用户为准（覆盖旧版映射要同步重排
  §1.6 小节顺序并改文件头映射表）；自行推断只用于用户未指名的版式。
- 无对应元素的版式（figure/steps/matrix/two-col）保持上游默认并注明。
- 绝对定位装饰（色块网格/光晕/竖排轨/footer 多列/巨数字/大引号）：行式 DOM
  （CM6 每行一 div）无挂点 → **有意未复刻**，逐一注释；能近似则近似（如 y-mark→巨引号）。

## 4. 换算规则

- 锚点：放映基准字号 `clamp(17px,1.35vw,26px)`，1080p ≈ **26px/em**；模板 px ÷ 26 = em。
- 列表行内的元素：先定 li 基准字号（= 行说明文字 px ÷26），再对行题/序号
  **除以 li 缩放**补偿（如 38px 序号在 li 0.58em 下 = 38÷26÷0.58 = 2.52em）。换算式写入注释。
- 页边距：px ÷1920 → vw；顶部安全区扣掉 chrome 高度。

## 5. 严格还原五要素（逐项检查单）

- **背景**：全页换色页必须"整条层叠链"上色（见 §6-1）；非换色页不得写页面级背景。
- **标题**：字体/字重/字号/行高/字距/颜色/对齐（含 `justify-content`、`max-width`）；
  内容页标题色以模板为准（em 才切色的主题须全局规则 + 版式覆盖双份）。
- **子标题/眉标**：kicker 走 `[data-slide-kicker]::before` 覆写字号/字距/透明度。
- **正文**：li 基准缩放 + `strong`（行题）+ `listmark`（序号/日期）三件套；
  卡片去胶囊化 = `background:transparent; border:none; box-shadow:none` 后重画模板边线。
- **颜色**：强调色只做底/线不做文字时，`--link-color` 换可读档（≥4.5:1，CR-04）；
  strong 永远用正文色，不用 accent。
- **对象框**：卡片/面板若为行级元素直接自绘；引用面板整块画底色（相邻行只 margin）；
  外框宽度按 **border-box** 对照（模板 `max-width` 已含内距，别把内距加到外面）。
- **位置**：页内垂直居中（模板 `.slide` 每页 `justify-content:center`，见 §6-10）、
  页边距、对象框宽度、行间距（gap / margin 双份都要算）。

## 6. 陷阱与修法（血泪清单）

1. **换底页背景层叠链**：页面底色实际由 `.cm-editor/.cm-scroller` 绘制。
   修法 = 底色同时打在 `body:has(#editor[data-slide-layout='x'])`、`#editor`、
   `.cm-editor`、`.cm-scroller`、`.cm-content` 五层（只挂 body 或漏 #editor 都会被
   原底色反盖，"蓝页显成黄页"）。打印域用 `body.slides-printing:has(.cm-md-slide-x)`。
   ⚠️ 先核对原 HTML 的**页面**底色：pane ≠ 页面（如 CTA 左墨蓝 pane，页面仍是黄纸）。
2. **同色隐形**：换底页上 `.slide-ghost`（=var(--text-color)）与表格 `td` 会与底色同色
   → ghost 加 `opacity:0`（与上游 section/closing 一致）；td 换纸面色。th 自带底色不受影响。
3. **文档式规则权重漏进放映**：`#editor .cm-content` 带 id 权重压过 slides.css
   → 1.6.1 用 `body.presenting #editor .cm-content .cm-md-page-title` 重断言声部
   （并 `border-bottom:none` 干掉文档式标题下划线）。
4. **CSS-03**：`.cm-md-blockquote` 及其相邻行禁纵向 padding → 留白只走 margin。
5. **不可见强调色**（accent≈底色）：换可读强调档 + seed-accent 保留原色供底/线用 + CR-04 备案。
6. **flex-end 溢出**：底部对齐页内容超高时顶部裁切且不可滚动——换算后预估高度 < 视口再用。
7. **字重**：display 字体常只有 400（Instrument Serif / DM Serif Display），
   生成版默认 700 是错的，文档层与令牌层都要改回 400。
8. **版式类与行角色类同 div**：版式类（`.cm-md-slide-quote`）是 Decoration.line
   行级盖章，与行角色类（`.cm-md-blockquote` / `.cm-md-li` / `.cm-md-page-title`）
   落在**同一个 div** 上，不是祖先后代关系。上游 `slides.css` 的
   `.cm-md-slide-quote .cm-md-blockquote` 后代写法在编辑器 DOM 打不中，
   必须改用复合选择器 `.cm-md-slide-quote.cm-md-blockquote`（8-bit-orbit 实测）。
9. **`--slide-*` 之外的页面底色变量**：需要按页换底又不想撞 SLIDE-01 令牌命名时，
   用 `--page-bg` 一类自有变量承载，不要新造 `--slide-*`。
10. **整页垂直居中**：模板 `.slide` 常是 `flex column + justify-content:center`（每页都居中），
   上游只居中 cover/section/closing/two-col。
   修法：单列页（agenda/figure/quote）→ `.cm-content{display:flex;flex-direction:column;
   justify-content:safe center;min-height:92vh}`；多列卡片页（kpi/matrix/steps/timeline）
   **不能**用 flex 列（每张卡会拆成一行）→ `flex-wrap:wrap` + `align-content:safe center`，
   卡片 `flex:0 0 auto`，其余行 `flex:0 0 100%`；同时 `display:none` 页头指令行、
   把页首行 `padding-top` 归零。只挂 `body.presenting`，导出保持文档式排版。
11. **同级卡片取色**：第 N 张卡的颜色用 `:nth-child(N of .cm-md-slide-x.cm-md-li)`
   命中（Chrome 111+），旧内核自然回落首色——比"只取首色"忠实，且不需要 nth-of-type。
12. **校验器不认伪类里的逗号**：`:nth-child(1 of A, B)` 会被逗号拆成两个选择器，
   第二段判成未作用域（SLIDE-02）。改成单选择器规则，一条一个 `of`。
13. **上游 `.cm-md-li` 自带 `margin:0.45em 0`**：自己加 `padding-block` 撑 gap 前先
   `margin-block:0`，否则 18px 变 29px；首/末行判定用 `:has(~ S)`（不是 `+`），
   空行插在中间也不会误判。
14. **先检索再断言元素存在**：用户点名的版式/装饰（如 Motion）在模板里可能根本不存在，
   全量检索 `class|@keyframes|animation` 后写进"不存在/未复刻"说明，不要臆造页面。

## 7. paradigm 备案规范

- 可修则修（SL-03 色相轴、SL-04 明度序、NT-01 色相对齐、CR-02 对比度等）。
- 身份项备案标准：**模板刻意设计**（黄纸/暗黑底、高饱和强调）→ 文件头写明
  规则编号 + 数值 + "为什么保留"（谁承担身份、文字色如何绕开）。
  通过标准：SLIDE/CSS 类违规必须 0；范式 ERROR 只允许已备案的身份项。

## 8. 校验

```bash
npx tsx src/cli.ts validate themes/<slug>.css
```

- 必过：`:root 根块与选择器契约通过`、`幻灯片版式: 支持`、无 SLIDE-01/02/03、
  无 SLIDES-*、无 CSS-03。
- 允许：文件头已备案的 SL-01/SL-02/CR-04/NT-03 类身份项（exit 1 属预期）。
