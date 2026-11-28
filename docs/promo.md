# ColaMD Themes — 推荐文案 / Promo Copy

> 用于 DSH 插件社区、awesome-dsh-plugin 讨论帖与社交平台的推荐内容。
> 所有数字与 API 名均可在仓库中核对（版本 `0.8.6`）。

---

## 一句话 / One-liner

**中文**：在 DSH 里直接按 69 套主题排版 Markdown，并把文稿或幻灯片导出成与屏幕一致的 PDF / Word / PPTX。

**English**: Lay out Markdown with 69 themes right inside DSH, and export documents or slide decks to PDF / Word / PPTX that match what you see.

---

## 它解决什么问题 / Why it exists

DSH 的 Markdown 预览能看，但排版是「能读」而不是「能交付」。想把它变成一份带品牌感的文档、一页页能讲的幻灯片，过去只有两条路：导出 HTML 再拿浏览器打开，或者把内容复制进别的工具重排。

ColaMD Themes 把这条链路收进了 DSH 内部：主题选择在输入框旁边，渲染在右侧文档预览里就地完成，导出与屏幕同一份 CSS。

DSH renders Markdown fine, but "readable" is not "deliverable". Turning a note into a branded document or a deck used to mean exporting HTML and opening a browser, or re-laying it out somewhere else. ColaMD Themes puts that whole path inside DSH: the theme picker sits next to the composer, rendering happens in place in the document preview, and exports share the exact CSS you see.

---

## 装完立刻能感觉到的三件事 / Three things you notice immediately

### 1. 输入框左边多了个「主题」胶囊 / A theme chip beside the composer

点开是主题样例卡片墙，卡片用主题自己的配色画出缩略图 —— 选之前就知道长什么样。

- **69 套主题**：57 套本地生成 + **12 套 ColaMD 内置**（`bear` `dark` `dracula` `elegant` `gruvbox` `light` `midnight` `nord` `notion` `sepia` `solarized-dark` `writer`），内置的带「内置」徽标
- **六档分类**：全部 / 浅色 / 深色 / 暖调 / 冷调 / 内置
- **搜索**：按名称、副标题、描述一起匹配
- 选择即生效，状态存到 `~/.colamd-themes/dsh-ui.json`

### 2. 打开 `.md` 就地按主题渲染 / Markdown files render in place

右侧文档预览的渲染器下拉里多一项「**ColaMD 主题**」，正文按主题排版渲染 —— 衬线标题、等宽代码、表格配色、引用条，全部按主题契约来。

渲染结果挂在 **shadow root** 里，主题样式不会漏进应用界面，应用的样式也不会污染文档。

### 3. 标题栏继续调 / Keep tuning from the title bar

文档标签栏上有四个控件，不用回输入框：

| 控件 | 作用 |
| --- | --- |
| 文稿 / 幻灯片 | 切换渲染模式 |
| 主题胶囊 | 同一套搜索 + 分类面板 |
| 全屏 | 铺满窗口的演示层 |
| 导出 | 按模式给不同格式 |

---

## 幻灯片是认真的 / Slides are taken seriously

不是「把 Markdown 切成一页页」那么简单 —— 版式严格照上游 ColaMD-extend 的契约渲染。

- **同一份 `slides.css`**：直接使用上游样式表，只做选择器映射（`body.presenting` → `.ct-stage.presenting`、`#editor` → `.cm-page`），不维护第二套 CSS
- **11 种版式**：`cover` `section` `agenda` `kpi` `timeline` `steps` `matrix` `two-col` `figure` `quote` `closing`（`src/templates/slides.css` 实测 11/11 齐备）
- **页头指令**：`<!-- slide: kpi label: 关键数字 -->`、`<!-- deck-brand: … -->`，支持 `kicker:` / `label:` / `chapter:` 字段与跨行块
- **主题的分版式配色同样生效**：主题里写的「品红巨题」「左题右数字」这类规则，屏幕上和导出后一致
- **纸面 1920×1080**，内容超页按字号收敛，不会把字缩到看不清，也不会切掉页底

### 三种形态，同一份纸面 / Three modes, one paper

| 形态 | 表现 |
| --- | --- |
| 标签页（非全屏） | 逐页流动：所有页按 1920×1080 排版后整体等比缩放、纵向排列 |
| 全屏演示 | 一页一屏，`←` / `→` 翻页、`F` 全屏、底部 HUD 提示页码 |
| 导出 PDF | 一页一张 16:9，与屏幕同款 |

---

## 导出跟屏幕一致 / Exports match the screen

| 模式 | 可选格式 |
| --- | --- |
| 文稿 | **文档 PDF（A4）**、**Word（.docx）** |
| 幻灯片 | **幻灯片 PDF（16:9）**、**幻灯片 PPT（.pptx）** |

- 打印态同时吃 `presenting` 与 `printing` 两套规则，所以导出就是屏幕上那一版
- A4 逐页克隆内边距 + 整页底色：深色主题不再出现白纸边
- `<!-- … -->` 注释**只在导出时**摘掉，屏幕预览照旧可见（与 ColaMD-extend 编辑器一致）
- 零依赖 OOXML 写入器：DOCX 8 个部件（实测 37 KB）、PPTX 12 个固定部件 + 每页 `slideN.xml` 与其 `.rels`（10 页实测 38 个部件 / 71 KB），Word / PowerPoint 打开无修复提示

---

## 为什么它轻 / Why it stays light

- 预览渲染器（Markdown → 主题 HTML）与 OOXML 写入器都是**自带的**，运行时**不依赖** `@bytechain.cn/colamd`
- 装到 DSH 里就是一个 bundle：宿主 6 条 HTTP 路由 + 一个 `client.js`
- 路由全部同源校验：`POST` 只接受 `sec-fetch-site: same-origin` + `Origin` 与 `Host` 一致
- 契约对齐 `@bytechain.cn/colamd@2.8.2`（`SUPPORTED_CONTRACTS = ["2.8.0", "2.8.2"]`，`status: "exact"`，无漂移告警）

宿主路由：`/catalog` `/preview` `/render` `/export` `/present` `/selection`（前缀 `/api/bytechain/colamd-themes`）。

---

## 安装 / Install

```bash
# 从 npm 安装（预构建）
dsh plugin --profile web add @bytechain.cn/colamd-themes
```

或在 DSH 的插件管理里装本仓库。宿主代码有改动时需要**重启一次 DSH Desktop**；纯客户端改动 `Ctrl+Shift+R` 即可。

---

## 适合谁 / Who it's for

- 每天在 DSH 里读写 Markdown，但受不了默认排版的人
- 要把笔记、会议纪要、技术文档直接导出成 PDF / Word 交付的人
- 想拿 Markdown 当幻灯片讲，又不想开 PowerPoint 重排的人
- 需要一套统一主题体系（同一份 CSS 同时管编辑器、导出文档、幻灯片）的团队

---

## 截图 / Screenshots

| 图 | 内容 |
| --- | --- |
| `assets/screenshots/document-elegant.png` | elegant 主题下的文稿排版（侧边栏宽度） |
| `assets/screenshots/document-pink-script-dark.png` | pink-script-dark 主题，同一份内容 |
| `assets/screenshots/slides-cover.png` | 幻灯片封面页（pink-script-dark，16:9） |
| `assets/screenshots/present-agenda.png` | 全屏演示的 agenda 页（含翻页 HUD） |

---

## 短版 / Short version（社交平台）

> **中文**
>
> DSH 里终于能好好排版 Markdown 了。
>
> 装个 `@bytechain.cn/colamd-themes`：输入框旁边多一个「主题」胶囊，69 套主题（含 12 套 ColaMD 内置）带样例卡片，选完打开 `.md` 就按那个主题渲染 —— 不导出 HTML、不另开浏览器。
>
> 更实用的是幻灯片：`<!-- slide: kpi label: 关键数字 -->` 写页头指令，11 种版式照 ColaMD-extend 的契约渲染；标签页里逐页流动看，全屏一页一屏讲，导出的 16:9 PDF 和屏幕一模一样。
>
> 文稿导出 A4 PDF / Word，幻灯片导出 16:9 PDF / PPTX。运行时零外部依赖。
>
> `dsh plugin --profile web add @bytechain.cn/colamd-themes`

> **English**
>
> Markdown in DSH finally looks like something you'd ship.
>
> Install `@bytechain.cn/colamd-themes`: a theme chip appears beside the composer with 69 themes (12 of them ColaMD built-ins) shown as sample cards. Pick one, open any `.md`, and it renders with that theme in place — no HTML export, no second browser window.
>
> The slide mode is the interesting part: write page directives like `<!-- slide: kpi label: Key numbers -->` and 11 layouts render against the ColaMD-extend contract. Page-by-page flow view in the tab, one-page-per-screen when presented fullscreen, and the exported 16:9 PDF matches the screen exactly.
>
> Documents export to A4 PDF / Word; decks export to 16:9 PDF / PPTX. No runtime dependency on the platform package.
>
> `dsh plugin --profile web add @bytechain.cn/colamd-themes`

---

## 提 PR 到 awesome-dsh-plugin 的条目 / Listing entry

条目文件：`data/plugins/byteuser1977__ColaMD-themes.yml`

```yaml
url: https://github.com/byteuser1977/ColaMD-themes
name: byteuser1977/ColaMD-themes
category: docs
icon: https://raw.githubusercontent.com/byteuser1977/ColaMD-themes/main/assets/icon.png
description:
  en: 'Markdown themes for DSH: pick one of 69 themes beside the composer, render .md files in place, and export documents or 11-layout slide decks to PDF, Word or PPTX with the same CSS.'
  zh: 'DSH 的 Markdown 主题工具：输入框旁选 69 套主题，按主题就地渲染 .md，并把文稿或 11 种版式的幻灯片导出为与屏幕一致的 PDF / Word / PPTX。'
```

> 注意：描述里含 `: ` 时必须加引号（上面已加），否则 YAML 解析失败。

---

## 发布记录 / Publication log

| 渠道 | 入口 | 状态 |
| --- | --- | --- |
| awesome-dsh-plugin（站点 + dsh-market 数据源） | `data/plugins/byteuser1977__ColaMD-themes.yml` | 已收录（PR #14284，2026-11-11）；本次更新分类与描述 |
| awesome-dsh-plugin 讨论帖 | Discussions #15449 `plugin:byteuser1977/ColaMD-themes` | 已建帖；本次补充 0.8.6 更新说明 |
| npm | `@bytechain.cn/colamd-themes@0.8.6` | 已发布 |
