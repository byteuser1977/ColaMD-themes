<!-- deck
brand: ColaMD Themes
title: ColaMD-themes 技术文档总结
meta: 2026.11 · v0.8.0
-->

<!-- slide: cover
label: 技术文档总结
-->

# ColaMD-themes 技术文档总结

## 契约驱动的 Markdown → PDF · 幻灯片工具链

基于 ColaMD 2.8.0 契约与 v0.8.0 工具链的技术文档精炼。

---

<!-- slide: agenda
label: 路线图
-->

## 四章路线

1. **工具全景** 命令体系与关键数字
2. **契约与主题** 2.8.0 变量契约与校验
3. **幻灯片系统** 11 版式与总到分工作流
4. **复刻与质量** 逐页复刻方法论与工程保障

---

<!-- slide: section
kicker: 一行命令出片
label: 工具全景
chapter: A 工具全景
-->

## 一行命令，从 Markdown 到品牌化成片

生成、提取、导出、校验六条命令覆盖全部工作流。

---

<!-- slide: kpi
kicker: 项目全景数字
label: 关键数字速览
chapter: A 工具全景
-->

## 项目关键数字

- **58 个** 主题全部通过 validate 校验
- **15 套** 内置色彩系统（莫兰迪 / 马卡龙 / 北欧 / 复古 / 薄荷）
- **11 种** 幻灯片版式，项数各有契约
- **5 条** PDF 内容契约（PDF-01…05）
- **31 个** 幻灯片令牌（2.8.0 slides.css）

---

<!-- slide: matrix
kicker: 六条命令覆盖全流程
label: 命令速览
chapter: A 工具全景
-->

## 命令速览

- **ppt** 一键：deck 生成 + 校验 + 16:9 PDF
- **extract** 从 URL / DOCX / PDF / HTML 提取主题
- **export-slides** deck 按幻灯片纸版式打印 PDF
- **export-html / pdf** 文档式 A4 成片
- **validate** 主题 CSS 与 deck 指令双校验
- **check-pdf** 导出产物自动体检

---

<!-- slide: section
kicker: 主题即变量
label: 契约与主题
chapter: B 契约与主题
-->

## 写对 :root，渲染层自己接管

2.8.0 契约 27 活变量 + 9 个 Pele 图表色。

---

<!-- slide: matrix
kicker: 契约是唯一的主题接口
label: 2.8.0 契约要点
chapter: B 契约与主题
-->

## 2.8.0 契约要点

- **27 活变量** bg / text / code / table / selection / font / editor + 9 个 --pele-*
- **18 死变量** surface / accent / radius / mermaid / font-heading 等禁用
- **:root 单块** 变量只认文档根，body.theme-* 不消费
- **≤300 行** 生成 CSS 上限，禁 pt 单位与 !important
- **CJK 栈** 字体须含中文字族并以 generic family 结尾

---

<!-- slide: quote
kicker: 主题即变量
label: 设计金句
chapter: B 契约与主题
-->

> **变量化优先** — 所有颜色 / 字体 / 字号 / 间距一律 CSS 自定义属性，选择器禁止裸值

主题设计六大原则 · ColaMD Themes

---

<!-- slide: section
kicker: deck 即普通 Markdown
label: 幻灯片系统
chapter: C 幻灯片系统
-->

## deck 是普通 Markdown

`---` 分页，页头 `<!-- slide: -->` 指令选版式。

---

<!-- slide: matrix
kicker: 版式由内容形状决定
label: 11 版式速览
chapter: C 幻灯片系统
-->

## 11 版式速览

- **cover / section** 封面定调与章封留白
- **agenda / steps** 有序清单与步骤流
- **kpi / timeline** 大数字与日期行
- **matrix / two-col** 卡片并列与左右对照
- **figure / quote** 图表主体与金句
- **closing** 末页行动清单

项数契约：agenda 3-6 · kpi 2-6 · timeline 3-6 · steps 3-5 · matrix 3-8 · closing 2-8。

---

<!-- slide: steps
kicker: 长文档先提炼再上片
label: 总到分工作流
chapter: C 幻灯片系统
-->

## 长文档总到分工作流

1. **总** 通读全文：全局总结 + 叙事弧 + 页数预算
2. **分** plan.md 逐页规划：版式 / 内容 / 选版理由，交审阅门确认
3. **生成** 依确认 plan 一次写成 deck；validate ≤2 次，export 仅 1 次

---

<!-- slide: section
kicker: 逐页复刻方法论
label: 复刻与质量
chapter: D 复刻与质量
-->

## 逐页复刻：模板像素 → 版式规则

26px 放映基准，换算式写进注释。

---

<!-- slide: matrix
kicker: 严格还原的五个抓手
label: 复刻方法论要点
chapter: D 复刻与质量
-->

## 复刻方法论要点

- **页面映射** 11 版式对号入座，用户指定映射优先
- **换算规则** 模板 px ÷ 26 = em；clamp 取 1920×1080 落点
- **还原五要素** 背景 / 标题 / 眉标 / 正文 / 位置逐页核对
- **换底五层链** body:has + #editor + cm-editor / scroller / content 缺一被反盖
- **复合选择器** 版式类与行角色类同 div，禁用后代写法

---

<!-- slide: kpi
kicker: 契约管两头：进渲染器的与出渲染器的
label: 校验契约数字
chapter: D 复刻与质量
-->

## 校验契约数字

- **15 条** 复刻陷阱血泪清单
- **8 条** SLIDES 指令契约规则
- **3 条** SLIDE 主题令牌规则
- **5 条** PDF 产物内容契约

---

<!-- slide: closing
kicker: 把契约交给 CI
label: 行动清单
chapter: D 复刻与质量
-->

## 行动清单

- **跑 validate** 主题与 deck 全量入 CI，范式身份项用 colamd-allow 备案
- **勿写纸面校准** 2.8.0 导出与放映同标度，旧压缩块会二次缩小
- **善用 token 优化** 无公式导出 1.5MB → 57KB
- **升平台** 幻灯片导出需 @bytechain.cn/colamd ≥ 2.8.0
