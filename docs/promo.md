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
| awesome-dsh-plugin（站点 + dsh-market 数据源） | `data/plugins/byteuser1977__ColaMD-themes.yml` | 已收录（PR #14284，2026-11-11）；0.8.6 的条目更新见 PR [#19599](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/19599)（分类 `dev` → `docs`、描述重写、加 `icon`） |
| awesome-dsh-plugin 讨论帖 | Discussions [#15449](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions/15449) `plugin:byteuser1977/ColaMD-themes` | 已建帖；已追加 0.8.6 更新说明（中文 [#discussioncomment-19976222](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions/15449#discussioncomment-19976222)、英文 [#discussioncomment-19976224](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/discussions/15449#discussioncomment-19976224)） |
| imsai-sh/awesome-deepseek-harness-plugins（deepseek1024.com 目录） | `catalog/plugins/byteuser1977--colamd-themes.json` | **已合并**：PR [#1139](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/1139)，`category: tools`，`added: 2026-11-28` |
| 0xsline/awesome-deepseek-harness | `README.md` + `README.zh-CN.md`「UI, Themes & Interaction」 | 已提 PR [#901](https://github.com/0xsline/awesome-deepseek-harness/pull/901) |
| Dominic789654/awesome-deepseek-harness | 已有条目（「Documents & Export」），本次只换描述 | 已提 PR [#812](https://github.com/Dominic789654/awesome-deepseek-harness/pull/812) |
| Zhiyuan-Fan/Awesome-DeepSeek-Harness-Plugins | `README.md` + `README.zh-CN.md`「UI & Clients」表格 | 已提 PR [#135](https://github.com/Zhiyuan-Fan/Awesome-DeepSeek-Harness-Plugins/pull/135) |
| libukai/awesome-deepseek-harness（三语 README） | `README.md` + `README_EN.md` + `README_JA.md`「主题与皮肤 / External Integrations / 外部連携」 | 已提 PR [#172](https://github.com/libukai/awesome-deepseek-harness/pull/172) |
| walkinglabs/awesome-deepseek-harness-plugins | `README.md`「Interfaces & Web UI」+ `README.zh.md`「近期通过核验的新增」 | 已提 PR [#171](https://github.com/walkinglabs/awesome-deepseek-harness-plugins/pull/171) |
| awesome-deepseekharness/awesome-deepseek-harness | 双 README 表格「Web UI, Skins & Desktop Pets / Web UI、皮肤与桌面宠物」 | 已提 PR [#247](https://github.com/awesome-deepseekharness/awesome-deepseek-harness/pull/247) |
| TimeMachineLab/awesome-deepseek-harness-zh | `data/projects.json`「界面与交互」+ 重新生成三份文档表格 | 已提 PR [#7](https://github.com/TimeMachineLab/awesome-deepseek-harness-zh/pull/7) |
| web-casa/Awesome-DeepSeek-Harness-Plugins（cordis.run） | 只接受 [cordis.run/submit](https://cordis.run/submit) 表单，不收 PR | 需登录后手工提交（表单要求英文、可走反链快速通道） |
| bruc3van/awesome-dsh-plugin-pro | 作者自荐要求仓库 star > 10 | 跳过（本仓库 1★） |
| fendouai/awesome-deepseek-harness | `data/*.json` + 生成脚本 | 跳过（近期 PR #134–#144 全部未合并，维护者不活跃） |
| weekend-project-space/awesome-deepseek-harness-top-500 | 单文件排名榜，只收 top 500 | 跳过（本仓库不在榜内，且只接受维护者自建排名） |
| npm | `@bytechain.cn/colamd-themes@0.8.6` | 已发布 |

### 各渠道的提交差异（避免重复踩坑）

- **awesome-dsh-plugin**：一条 YAML，`data/plugins/<owner>__<repo>.yml`；`ENTRY_KEYS` 只认 `url/name/category/description/icon/tarball/file`，**没有 `screenshots` 字段**；`description.en` 单行、含 `: ` 要加引号；`npm:` 手写会被拒（由 registry 自动映射）。
- **imsai-sh**：`catalog/plugins/*.json` 一条一文件，文件名是 id 的 `/` → `--` 转写；`category` 只能取 `catalog/categories.json` 的 11 个 id（**没有 `docs`**，主题类放 `theme`、工具类放 `tools`）；新增条目会被机器人自动 squash-merge，改已有条目要维护者人工合。
- **0xsline**：手写 Markdown，必须同时改 `README.md` 与 `README.zh-CN.md`，`## UI, Themes & Interaction` 一节；条目格式 `- [owner/repo](url) - 一句话`。
- **Dominic789654**：只允许改两个 README、**只允许新增行**（改已有行会被 insert-only 检查判失败），条目分隔符英文用 `—`、中文用 `——`；CI 会核对链接可达性与 `dsh`/`dsh-plugin`/`dsh-skill`/`deepseek-harness` topic。
- **Zhiyuan-Fan**：表格行，四列 `Project | Description | Stars 徽章 | Referenced by`；没有 `Referenced by` 时写 `<details><summary>0 pages</summary><sub>No verified references yet.</sub></details>`。
- **libukai**：三语 README（`README.md` / `README_EN.md` / `README_JA.md`）各加一行，中文段落里用全角冒号 `：`、英日段落用 `: `；仓库没有 CONTRIBUTING，按「精选插件 → 主题与皮肤」归类。
- **walkinglabs**：`docs/INCLUSION_POLICY.md` 要求**源码级 DSH 证据**（`dsh.bundle` + 注入的 `@deepseek-ai/dsh-client-*` + `ctx.webServer` 路由），描述里要写兼容的 DSH 版本；英文 README 按分类插入，中文 README 只往「近期通过核验的新增」末尾追加。
- **awesome-deepseekharness**：双 README 的**表格**各加一行（`| [owner/repo](url) | 一句话 | ⭐ |`），中英必须同步，CI 会查；PR 正文要写 DSH 关系、安装命令、License、topic、星数。
- **TimeMachineLab**：数据驱动，改 `data/projects.json` 里某个 section 的 `items`，再按 `scripts/render.py` 的同一套逻辑重生成 `docs/*.md` 里 `<!-- BEGIN:projects -->` 区块；不能只改 markdown。
- 本机 `git push` 到 github.com:443 间歇性被重置（`RPC failed; curl 28`），改用 GitHub API 造 blob → tree → commit → ref 再开 PR 稳定成功；脚本见 `.tmp-dsh/api-push-dominic.mjs`、`.tmp-dsh/zhiyuan-add.mjs`。
