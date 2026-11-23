<!-- deck
brand: ColaMD
title: ColaMD Themes
meta: Agent 原生主题工程化工具链
-->

<!-- slide: cover -->

# ColaMD Themes

## Agent 原生主题工程化工具链

从源文档提取视觉格式 → 生成 2.7.13 契约 CSS → 一键转幻灯片并导出 16:9 PDF

---

<!-- slide: agenda
kicker: A·开篇
label: 路线图
chapter: A 开篇
-->

## 今天聊四件事

1. **核心能力** 5 大特性
2. **导出与工程化** 4 项保障
3. **生态与集成** 3 种接入
4. **契约与范式** 2 条底线

---

<!-- slide: kpi
kicker: B·核心能力
label: 量化特性
chapter: B 核心能力
-->

## 关键数字

- **5 种** 提取源（URL / HTML / DOCX / PDF / auto）
- **11 种** 内置版式（cover / section / agenda / kpi / timeline / steps / matrix / two-col / figure / quote / closing）
- **15 套** 色彩系统（莫兰迪 / 马卡龙 / 北欧 / 复古 / 薄荷绿）
- **58 个** 契约主题（全部通过 `validate`）
- **1 条** 命令全链路（`ppt report.md`）

---

<!-- slide: timeline
kicker: B·核心能力
label: 演进脉络
chapter: B 核心能力
-->

## 一路走来

- **2024 年** v0.4.0 安全与性能（SSRF / 输入验证 / 异步 I/O / LRU / 错误码 / 资源清理）
- **2024 年** v0.5.8 token 优化（无公式文档 1.5MB→57KB，96% 字体剥离）
- **2025 年** v0.6.0 PPT 版式（11 版式 + 指令契约 + 内容适配）
- **2025 年** v0.6.1 HTML 模板提取（template.json 元数据 + 全量 24 令牌）
- **2026 年** v0.7.0 一键 ppt（生成→校验→导出→PDF-01~05 短路）
- **2026 年** v0.7.1 发布完整性（prepack 自动构建 + build-info 戳记）

---

<!-- slide: section
kicker: B·核心能力
label: 主题提取
chapter: B 核心能力
-->

## 主题提取

从源文档到契约 CSS 的自动化管道

---

<!-- slide: matrix
kicker: B·核心能力
label: 提取源对比
chapter: B 核心能力
-->

## 五种提取源

- **URL** — Cheerio + css-tree 解析 CSS 规则，选择器特异性 + 内联样式合并
- **HTML** — 同目录 `template.json` 提供名称 / tagline / 字体 / scheme / mood / density
- **DOCX** — Mammoth 读取完整样式（H1–H6、表格、代码块）映射为主题变量
- **PDF** — 多层启发式从文本提取排版元数据
- **extract** — 根据文件类型或 URL 协议自动路由到对应提取器

---

<!-- slide: two-col
kicker: B·核心能力
label: PPT 样式提取
chapter: B 核心能力
-->

## 品牌层

`--slide-title-font` / `--slide-mono` / `--slide-title-weight` 派生；版式字号阶梯保持上游默认

## 全量层

24 个按页类型定制令牌：封面/章节/收页字号阶梯取自模板 display/body 比例，页标题 / KPI / 引言 / kicker / chrome / 页边距按气质（bold/quiet/tech）+ 密度 + 正式度调校

---

<!-- slide: figure
kicker: B·核心能力
label: 提取管道架构
chapter: B 核心能力
-->

## 提取管道

```mermaid
flowchart LR
    A[来源] --> B[提取器]
    B --> C[色系匹配]
    C --> D[范式验证]
    D --> E[Handlebars]
    E --> F[CSS]
```

---

<!-- slide: section
kicker: B·核心能力
label: Markdown → PPT
chapter: B 核心能力
-->

## Markdown → PPT

自动推断版式、内容适配、产物自校验

---

<!-- slide: matrix
kicker: B·核心能力
label: 转换能力矩阵
chapter: B 核心能力
-->

## 四大转换能力

- **to-slides** — 11 版式自动推断，deck 块 + 页头指令块
- **内容适配** — 补 `**行标题**`、kpi 无数字/时间线无日期降级、列表超量拆续页、超长段落拆页
- **自校验** — 指令契约（页首/版式名/字段键/slide-css 安全）+ 内容契约（SLIDES-07）+ 溢出估算（SLIDES-08）
- **ppt** — 一键：源码 → deck → 校验 → 16:9 PDF → PDF-01~05

---

<!-- slide: steps
kicker: B·核心能力
label: 版式推断逻辑
chapter: B 核心能力
-->

## 版式推断四步

1. **分页** — `---` 语义切分，`@lezer/markdown` 与应用同一解析器
2. **推断** — 标题 / 列表 / 图表结构 → 页角色
3. **匹配** — 11 版式契约（项数 / 必须主体 / 行标题）
4. **生成** — deck 块 + 每页 `<!-- slide: -->` 指令块

---

<!-- slide: figure
kicker: B·核心能力
label: 11 版式对照
chapter: B 核心能力
-->

## 11 版式内容约定

| 版式 | 适用内容 | 页面结构 |
|---|---|---|
| cover | 封面 | 主标题 + 副标题 + 导语 |
| section | 章节页 | 短标题 + 一句说明 |
| agenda | 议程 | 有序列表 3-6 项 `**章名** 说明` |
| kpi | 数据速览 | 无序列表 2-6 项 `**数字+单位** 说明` |
| timeline | 时间线 | 列表项带年份 `**年份** 事件`，3-6 项 |
| steps | 步骤 | 有序列表 3-5 项 `**步骤名** 说明` |
| matrix | 能力矩阵 | 无序列表 3-8 项 `**名称** 说明` |
| two-col | 双栏 | 两个 h2 对半（左论点/右证据） |
| figure | 图表页 | 图片 / Mermaid / 表格为主体 |
| quote | 金句页 | 引用块为主体，引用后一行可作署名 |
| closing | 收页 | 行动清单 2-8 项 |

---

<!-- slide: section
kicker: C·导出与工程化
label: PPT PDF 导出
chapter: C 导出与工程化
-->

## PPT PDF 导出

960×540pt、自动缩放、PDF-01~05 内容契约

---

<!-- slide: kpi
kicker: C·导出与工程化
label: 导出关键指标
chapter: C 导出与工程化
-->

## 导出效能

- **1.5MB → 57KB** token 优化（无公式文档剥离 96% base64 KaTeX 字体）
- **960×540pt** 16:9 纸型（1280×720 @96dpi），幻灯片强制纸型
- **PDF-01~05** 5 条内容契约（可解析 / 纸型 / 页数 / 空白页 / deck chrome）
- **≤3 次** 字号微调（floor 0.6）保证 PDF 页数 = deck 页数

---

<!-- slide: matrix
kicker: C·导出与工程化
label: 安全与性能
chapter: C 导出与工程化
-->

## 五大工程保障

- **SSRF 防护** — 协议白名单 + 私有网络阻断
- **输入验证** — 1MB 大小限制 + 内容有效性
- **异步 I/O** — 非阻塞文件操作，批量导出响应稳定
- **LRU 缓存** — 最多 10 模板，TTL 30min + mtime 自动失效
- **统一错误码** — `CLIError` + `ErrorCode`，一致调试体验

---

<!-- slide: matrix
kicker: C·导出与工程化
label: CSS 模板分区
chapter: C 导出与工程化
-->

## CSS 模板五分区

- **分区 1** 设计令牌 — 种子色板 11 变量 + 14 语义色 + 9 Pele
- **分区 1.5** PPT 令牌 — `--slide-*` 2.7.13，预设气质 + 品牌字体
- **分区 2** 编辑器 DOM — `#editor .cm-content` + `.cm-md-*` 全系钩子
- **分区 3** 导出 HTML — `.colamd-document` 语义标签配色层
- **分区 4** `@media print` — 只补打印保真，屏幕规则原样生效

---

<!-- slide: quote
kicker: C·导出与工程化
label: 设计六大原则
chapter: C 导出与工程化
-->

> **变量化优先** — 所有颜色/字体/字号/间距一律 CSS 自定义属性，选择器禁止裸值
>
> **模块化** — 主题 = 变量 + 极少量选择器微调，内置系统自动继承
>
> **语义化** — `--link-color` 而非 `--color-blue`；`--font-body` 而非 `--font-sans`
>
> **可推导性** — 完整主题由 11 个种子令牌 + 3 组字体栈自动推导
>
> **打印保真** — 导出直接打印当前窗口，`@media print` 只补 `print-color-adjust: exact`
>
> **无死规则** — CodeMirror 6 无 `#write`/`.ProseMirror`/`<h1>`/`<blockquote>`，只用 `.cm-md-*` 行类

— 2.7.13 契约六大原则

---

<!-- slide: section
kicker: D·生态与集成
label: 多 Agent Skill
chapter: D 生态与集成
-->

## 多 Agent Skill

单一源文件生成 7 份 Agent 专用定义

---

<!-- slide: matrix
kicker: D·生态与集成
label: 7 目标 Agent
chapter: D 生态与集成
-->

## 7 目标 Agent（上）

- **Claude Code** — `.claude/skills/colamd-themes.skill.md`（`name` / `description`）
- **OpenCode** — `.opencode/skills/colamd-themes/SKILL.md`（`version` / `allowed-tools` / `hooks`）
- **OpenClaw** — `.openclaw/skills/colamd-themes/SKILL.md`（`icon` / `author` / `metadata.openclaw.os`）
- **Hermes** — `.hermes/skills/tools/colamd-themes/SKILL.md`（`license` / `metadata.hermes.tags` / `prerequisites`）

---

<!-- slide: matrix
kicker: D·生态与集成
label: 7 目标 Agent（下）
chapter: D 生态与集成
-->

## 7 目标 Agent（下）

- **Trae 规则** — `.trae/rules/colamd-themes.md`（纯 Markdown，无前置元数据）
- **Trae Skill** — `.trae/skills/colamd-themes/SKILL.md`（`name` / `description` 单行 plain scalar）
- **DSH** — `.dsh/skills/colamd-themes/SKILL.md`（`version` / `metadata.dsh.tags` / `prerequisites`）

---

<!-- slide: two-col
kicker: D·生态与集成
label: DSH 插件双轨
chapter: D 生态与集成
-->

## Bundle 侧

`cordis.patch.yml` + 58 themes + skill 注入 Profile 组合树

## Runtime 侧

`apply()` 容错降级 + `BUNDLED_SKILL_RANK` 稳定常量 + 兼容层（双契约 + 幻灯片探测 + API 探测）

---

<!-- slide: matrix
kicker: D·生态与集成
label: DSH 兼容细节
chapter: D 生态与集成
-->

## DSH 兼容四要点

- **peer** — `^0.2.0-rc` 到 `^0.2.9-rc` 全覆盖，0.1.x 与 0.3+ 不在支持范围
- **apply** — skills 服务协议漂移降级为警告，不阻塞 Profile 加载
- **compat** — 双契约漂移 + 幻灯片版式探测 + 渲染器 API 探测，给出版本号与修复命令
- **bundle** — 146 文件（dist / themes / skills / cordis.patch.yml），`npm pack` 即可分发

---

<!-- slide: matrix
kicker: E·契约与范式
label: 2.7.13 契约总览
chapter: E 契约与范式
-->

## 2.7.13 契约要点

- **27 活变量** — bg/text/border/link/code/blockquote/table/selection/highlight/font/editor + 9 Pele
- **18 死变量** — surface/text-dim/heading/accent/hr/mermaid/radius/content-width/font-scale/line-height/font-*
- **选择器仅** `#editor .cm-content` + `.cm-md-*`
- **单位仅** `px` / `em` / `rem`（无 `pt`）
- **无 `!important`**（除 `@media print` 的 `print-color-adjust`）
- **CSS ≤ 300 行** / 字体栈含中文 fallback + generic family

---

<!-- slide: matrix
kicker: E·契约与范式
label: 范式验证规则族
chapter: E 契约与范式
-->

## 15+ 范式约束（7 族）

- **CR** 对比度（CR-01~05：正文/次要/弱化/点缀/内联代码 vs 底色）
- **HR** 色相轴一致性
- **SL** 明度序（SL-01~04：底色/文本/边框/点缀明度排序）
- **NT** 中性轴（灰阶温度一致）
- **BD** 边框深度（不超过 2 层）
- **MP/FS/SH** 其它（度量/字体/阴影）
- **CSS/SLIDE/SLIDES** 契约/机械规则（永不豁免）

---

<!-- slide: quote
kicker: E·契约与范式
label: colamd-allow 设计初衷
chapter: E 契约与范式
-->

> 真实的对比度问题必须通过加深文字色解决，而不是列进白名单。
>
> 仅 `SL-` / `CR-` / `NT-` 身份族可豁免；
> 契约类规则（`CSS-*`、`SLIDE-*`、`SLIDES-*`）永不接受豁免。
>
> — `colamd-allow` 机制设计初衷

---

<!-- slide: closing
kicker: F·收束
label: 现在就开始
chapter: F 收束
-->

## 现在就开始

- **起步** `git clone` + `npm i` + `npm run build`
- **一键** `cthemes ppt report.md -t elegant`
- **共享** 把品牌色提取成主题，团队共享同一套版式

---

<!-- slide: section
kicker: Appendix
label: 参考链接
chapter: Appendix
-->

## 参考链接

- **ColaMD-extend** — https://github.com/byteuser1977/ColaMD-extend（桌面编辑器与渲染引擎）
- **vscode-colaview** — https://github.com/byteuser1977/vscode-colaview（VS Code 预览扩展）
- **官网** — https://colamd.com/
- **下载** — https://github.com/byteuser1977/ColaMD-extend/releases/latest
- **Marketplace** — https://marketplace.visualstudio.com/items?itemName=bytechain.vscode-colaview