# 模板 → ColaMD 主题"逐页版式复刻"处理规则

> 来源：pink-script-dark / pin-and-paper / biennale-yellow 三个主题的精修实践，
> 以及后续 34 个模板批量精修（含 daisy-days 用户指定映射覆盖）的复盘；
> §6-15~19 的导出一致性规则来自 2.8.0 升级后 pink-script-dark（字号/颜色/位置
> 不一致）与 broadside（换底页跨页污染）的复盘。
> 适用：对 `beautiful-html-templates/templates/<slug>/template.html` 类多页 PPT 模板，
> 把每页视觉严格还原进 ColaMD 2.8.0 主题 CSS（幻灯片版式）。2.8.0 起放映与导出
> 同标度（1920×1080 设计空间），**导出一致性规则**集中在 §6-1、§6-15~21
> （同标度 / 换底页画布 / 配色行级化 / 两侧同构 / fixed chrome / webfont 镜像与
> 正文基准 / 页题选择器权重）。

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
   范式项按 §7 判"修复 or 备案"。带换底页的主题追加**导出冒烟测试**：混合 deck
   （换底页 + 暗底页各 ≥1）→ `export-slides` → 解 PDF 内容流逐页核对底色、墨色、
   字号（Tf 值）与字体（BaseFont/FontName）——方法见 §6-16/§6-20，broadside
   「每页背景色不一致」、pink-script-dark「section 字体不一致」即此关拦下。
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
  ⚠️ 现有幻灯片主题已在两个作用域把基准提到 **28px**（§6-20）——换算式仍按
  `模板 px ÷ 26` 记录推导，实际渲染 ≈ em × 28（即模板 px × 28/26 ≈ +7.7%）。
- 列表行内的元素：先定 li 基准字号（= 行说明文字 px ÷26），再对行题/序号
  **除以 li 缩放**补偿（如 38px 序号在 li 0.58em 下 = 38÷26÷0.58 = 2.52em）。换算式写入注释。
- 页边距：px ÷1920 → vw；顶部安全区扣掉 chrome 高度。

## 5. 严格还原五要素（逐项检查单）

- **背景**：全页换色页放映必须"整条层叠链"上色（见 §6-1）；**导出严禁套用五层链**
  （整册单 DOM，`:has` 会跨页污染）→ 行级底色 + page-start 整纸画布（§6-16）；
  非换色页不得写页面级背景。
- **标题**：字体/字重/字号/行高/字距/颜色/对齐（含 `justify-content`、`max-width`）；
  内容页标题色以模板为准（em 才切色的主题须全局规则 + 版式覆盖双份）；
  导出侧版式页题选择器必须带 `#editor .cm-content` 提权（§6-21）。
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

1. **换底页背景层叠链（放映侧）**：页面底色实际由 `.cm-editor/.cm-scroller` 绘制。
   修法 = 底色同时打在 `body:has(#editor[data-slide-layout='x'])`、`#editor`、
   `.cm-editor`、`.cm-scroller`、`.cm-content` 五层（只挂 body 或漏 #editor 都会被
   原底色反盖，"蓝页显成黄页"）。
   ⚠️ 先核对原 HTML 的**页面**底色：pane ≠ 页面（如 CTA 左墨蓝 pane，页面仍是黄纸）。
   ⚠️ **导出严禁套用五层链（含 §6-15 之前的旧结论"打印域用
   `body.slides-printing:has(.cm-md-slide-x)`"已作废）**：2.8.0 导出是整册一个 DOM
   一次分页成纸，链层无法按页上色——`:has(.cm-md-slide-x)` 全局命中，deck 里只要有
   一张换底页，body/#editor/.cm-editor/.cm-scroller/.cm-content 全部染上该底色，
   其余暗底页跟着显橙/显蓝（broadside「每页背景色不一致」实测，PDF 内容流逐页验证）。
   导出改**行级方案：行级底色 + page-start 整纸画布**，见 §6-16。
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
   ⚠️ 这也是**放映/导出不一致**的常见根因：两侧镜像规则里一侧写成后代形式
   （`.cm-md-slide-agenda .cm-md-page-title`）就不命中，该侧退回上游/文档式声部
   （pink-script-dark section 原始状态：放映侧后代式不命中 → 5.1em 纸色默认声部，
   导出侧带 id 复合式命中 → 3.38em 粉色，两侧分裂）。两侧必须同命中形式：
   行角色在行 div 本身的（页题/kicker::before）用复合形式；inline 子元素
   （strong/listmark/url）是行 div 的真子节点，用后代形式。
   ⚠️ 注意后代式两侧都写时是"一致地错"（都回落默认声部）——复核时要对照
   模板意图，不是对照当前两侧是否一致。
9. **`--slide-*` 之外的页面底色变量**：需要按页换底又不想撞 SLIDE-01 令牌命名时，
   用 `--page-bg` 一类自有变量承载，不要新造 `--slide-*`。
10. **整页垂直居中**：模板 `.slide` 常是 `flex column + justify-content:center`（每页都居中），
   上游只居中 cover/section/closing/two-col。
   修法：单列页（agenda/figure/quote）→ `.cm-content{display:flex;flex-direction:column;
   justify-content:safe center;min-height:92vh}`；多列卡片页（kpi/matrix/steps/timeline）
   **不能**用 flex 列（每张卡会拆成一行）→ `flex-wrap:wrap` + `align-content:safe center`，
   卡片 `flex:0 0 auto`，其余行 `flex:0 0 100%`；同时 `display:none` 页头指令行、
   把页首行 `padding-top` 归零。只挂 `body.presenting`，导出不跟随——平台只对
   cover/section/closing 在纸面出 spacer 居中，其余版式导出为顶部排版（两侧差异
   属平台行为；强行两侧居中见 §6-18 的同构要求）。
11. **同级卡片取色**：第 N 张卡的颜色用 `:nth-child(N of .cm-md-slide-x.cm-md-li)`
   命中（Chrome 111+），旧内核自然回落首色——比"只取首色"忠实，且不需要 nth-of-type。
12. **校验器不认伪类里的逗号**：`:nth-child(1 of A, B)` 会被逗号拆成两个选择器，
   第二段判成未作用域（SLIDE-02）。改成单选择器规则，一条一个 `of`。
13. **上游 `.cm-md-li` 自带 `margin:0.45em 0`**：自己加 `padding-block` 撑 gap 前先
   `margin-block:0`，否则 18px 变 29px；首/末行判定用 `:has(~ S)`（不是 `+`），
   空行插在中间也不会误判。
14. **先检索再断言元素存在**：用户点名的版式/装饰（如 Motion）在模板里可能根本不存在，
   全量检索 `class|@keyframes|animation` 后写进"不存在/未复刻"说明，不要臆造页面。
15. **导出与放映同标度（平台 2.8.0 起）**：幻灯片纸面是 1920×1080 设计空间
   （20×11.25in，PDF 1440×810pt），正文 25.92px——与放映 26px 基准一致
   （主题可整体提到 28px，见 §6-20）；
   装不下的页由平台整页 `zoom` 压回一页。因此**不要再写「导出纸面校准」块**
   （历史上按 1280×720@24px 纸面 ÷36 换算的 `body.slides-printing` 压缩规则，
   2.8.0 下会造成二次缩小，导出字号整体变小）；`--slide-page-top-pad-print`
   令牌已废除。主题对视口派生令牌（page-pad-x / body-size / kicker-size /
   chrome-pad-y / chrome-logo-h / foot-pad-y / img-max-h / figure-max-h）的覆盖
   只在放映生效，纸面恒为上游钉死的值（如 pad-x=115.2px、kicker=13.824px @1920，
   平台在 `body.slides-printing` 上以同名变量覆盖，后到先赢）。
16. **导出换底页 = 行级底色 + page-start 整纸画布**（§6-1 的导出侧修法）：
   导出纸面里版式类铺在该页**每一行**上（含指令行/空行），逐页上底只能落在行上：
   ① 每行 `background: <底色>`；② 页首行（`.cm-md-slide-x.cm-md-page-start`）
   `position:relative` + `::after` 整纸画布——`content:''; visibility:visible;
   position:absolute; top:0; left:-115.2px; right:-115.2px; height:1080px;
   background:<底色>; z-index:-1`。负 z 落在链层底色之上、全部行内容之下，
   行间距、页尾余量、页顶 spacer 全由它兜底（不刷画布的话居中页下半会露暗底）。
   细节：`::before` 已被平台 spacer 占用，必须用 `::after`；页首指令行是
   `visibility:hidden`，画布要显式 `visibility:visible`；出血量 = 纸面 pad-x
   钉死值 115.2px（不是主题自己的 --slide-page-pad-x）；换底页里显式
   `background:transparent` 的行（卡片/引用/清单）要在导出补刷底色，否则落到
   平台暗底上。已知残留：整页 zoom 的溢出页画布随 zoom 缩小，页尾露一条暗边；
   inline-block 栏式行（kpi/matrix/steps 列）无法横向出血到纸边，列距露底色。
   验证手段：导出 PDF 后解内容流，按页找 `<底色> rg` + `0 0 1920 1080 re f`
   （换底页）与暗底页无整页底色填充（broadside 实测三页混合 deck 通过）。
17. **导出配色规则禁止 `:has` 全局命中**：与 §6-16 同一机制——
   `body.slides-printing:has(.cm-md-slide-cover) .cm-md-strong` 会把**整册所有页**
   的 strong/link/url/td/正文染成换底页的墨色，暗底页文字直接不可见
   （broadside「色彩不一致」实测）。导出侧换色一律行级：inline 子元素用后代
   `.cm-md-slide-cover .cm-md-strong`；行角色在行 div 本身的用复合
   `.cm-md-slide-cover.cm-md-page-title`。放映侧继续用
   `[data-slide-layout='x']` 属性选择器，两侧各写一份、值保持一致。
18. **导出与放映必须同构，禁止「仅一侧生效」的规则**：`data-slide-layout` 属性
   只在放映写上，导出靠行类命中——两侧镜像规则必须**同值、同命中形式**（§6-8）。
   同理禁止三类旧写法：① 导出纸面校准块（§6-15，二次缩小）；② 仅导出生效的
   装饰——CSS 计数器跨页计数在放映逐页 `display:none` 下恒为 01，无法与导出
   一致（pink-script-dark section 巨号案例 → 两侧都不做，文件头备案"未复刻"）；
   ③ 导出 padding-top 垫高 / 对齐覆盖（2.8.0 纸面对 cover/section/closing 由平台
   按放映同款规则整页居中，垫高会让巨题位置与放映不一致，且 `!important`
   垫高违反契约）。拿不准时问一句：这条规则删掉后两侧是否长得一样？
19. **chrome/foot/ghost 是全文档一份的 fixed 元素**：放映按当前页换内容/换色/隐藏；
   导出时 Chromium 把 fixed 元素**逐纸复刻**——单元素无法按页隐藏或换墨
   （`:has` 隐藏会把 chrome 从每一张纸上删掉）。ghost 与 foot-num 平台已在打印域
   `display:none`，不必再处理；chrome/foot 的模板差异（如"cover/quote/end 三页
   无 chrome"）只在放映复刻，导出统一走默认声部并注释备案——挑一个橙底/暗底
   两侧都可读的颜色。
20. **主题栈引用的 Google Fonts 必须随主题镜像 `@font-face`**：导出 shell
   不带任何 Google Fonts（renderer bundle 无 fonts.googleapis/gstatic 引用）——
   放映环境有该字体（应用加载/本地安装）而导出没有时字体会回落，字族两边
   不一致（pink-script-dark「封面标题导出字体与显示不一致」实测）。修法：
   在 `:root` 前镜像 latin 子集 woff2（地址从 css2 接口抓取；可变字体单文件
   `font-weight: 100 900`，静态字体按字重逐条）；CJK 由系统字体两侧一致承担
   不镜像（名字含 CJK / 以 SC·TC 结尾 / Noto·Source Han·LXGW 等一律跳过）；
   用 `@font-face` 而非 `@import`（导出拼样式表时 @import 位置非法会被丢弃）。
   验证：解 PDF 对象流找 `/BaseFont` 或 Type3 的 `/FontName`（可变字体 Skia 走
   Type3 字形嵌入，观感一致且带 ToUnicode）。正文基准：上游锚点
   `clamp(17px,1.35vw,26px)`（纸面钉死 25.92px）只占版宽 1.35%，观感偏小 ——
   主题可在两个作用域同时提基准：`body.presenting #editor .cm-content,
   body.slides-printing #editor .cm-content { font-size: 28px }`（与 slides.css 的
   `.cm-content` 字号规则同为 1,2,1，主题 CSS 由 applyTheme 追加在 slides.css 之后，
   同权重后到先赢；⚠️ 不能写裸 `#editor .cm-content`——(1,1,1) 压不过 slides.css 的
   (1,2,1)。pink-script-dark 1.6.0 同款，全部 em 等比放大，比例不变；导出 Tf=28
   实测验证）。
21. **导出侧版式页题规则必须带 id 权重**：1.6.1 的页题声明是
   `body.slides-printing #editor .cm-content .cm-md-page-title`（id + 三类 = 1,3,1），
   各版式的导出侧规则若写成 `body.slides-printing .cm-md-slide-x.cm-md-page-title`
   （0,3,1）**必输给 1.6.1**（特异性不看源码顺序）——导出页题退回默认声部，
   字号/颜色/字重与放映不一致（broadside section 实测：放映 5.54em 橙色 800、
   导出 3.32em cream）。修法：导出选择器补 `#editor .cm-content` 提到 (1,4,1)
   （pink-script-dark agenda/steps/closing/figure 同病同修）。全仓 23 主题已按此
   批量修复；其余主题部分版式因**放映侧本身是后代式**（§6-8，两侧都回落 1.6.1、
   彼此一致但偏离模板）被保守跳过，需逐主题复核放映侧命中形式后再修。
   ⚠️ 竞争对象辨析：只有**与 1.6.1 同元素**的导出规则（页题/页题 ::before）才
   非 (1,4,1) 不可；lead 的对手是上游 `body.slides-printing .cm-md-page-lead`
   (0,2,1)，(0,3,1) 已稳赢——但统一带上 `#editor .cm-content` 无害且防上游
   加权重，建议默认带。

## 7. paradigm 备案规范

- 可修则修（SL-03 色相轴、SL-04 明度序、NT-01 色相对齐、CR-02 对比度等）。
- 身份项备案标准：**模板刻意设计**（黄纸/暗黑底、高饱和强调）→ 文件头写明
  规则编号 + 数值 + "为什么保留"（谁承担身份、文字色如何绕开）。
  通过标准：SLIDE/CSS 类违规必须 0；范式 ERROR 只允许已备案的身份项。
- 备案必须机器可读，否则批量校验/CI 无法区分"已备案"与"回归"：

  ```css
  /* colamd-allow: SL-01, SL-02, CR-04 */
  ```

  只接受 `SL-` / `CR-` / `NT-` 身份族；`CSS-*` / `SLIDE-*` / `SLIDES-*` 拒绝豁免。
  豁免项仍会出现在 `validate --json` 的 `waived` 与 `--verbose` 中。
  不要把真实对比度问题写进豁免——那应当加深文字色（accent 只做装饰）。

## 8. 校验

```bash
npx tsx src/cli.ts validate themes/<slug>.css
```

- 必过：`:root 根块与选择器契约通过`、`幻灯片版式: 支持`、无 SLIDE-01/02/03、
  无 SLIDES-*、无 CSS-03。
- 身份项须以 `colamd-allow` 声明，声明后 `validate` 退出码为 0，并在 `waived`
  中列出；未声明的范式 ERROR 仍视为失败。
