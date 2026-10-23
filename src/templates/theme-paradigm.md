# ColaMD CSS 主题定义范式 v4.0

**适用范围**：ColaMD `themes/*.css` 用户主题文件的编写与 AI 辅助生成  
**契约版本**：ColaMD Extend 2.7（CodeMirror 6 编辑器 + Pele 图表引擎）  
**最后更新**：2026-10-23  
**关联文件**：`themes/template.css`（范式配套模板）、`src/templates/theme-template.hbs`（生成器模板）

---

## 1. 设计目标

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **变量化** | 颜色、字体、字号、间距一律通过 CSS 自定义属性定义。选择器规则中禁止出现裸色值（`#xxx`）、裸字号（`12pt`）、裸字体名 |
| **模块化** | 主题文件只定义变量 + 极小量选择器微调。图表与编辑器排版由内置系统（`base.css` / `editor-preview.css` / Pele 缺省值）自动承继 |
| **语义化** | 变量名描述用途而非外观。`--color-link` 而非 `--color-blue`；`--font-heading` 而非 `--font-sans` |
| **可推导** | 完整主题可由 11 个种子色 + 3 组字体栈自动推导，AI Agent 修改主题只需改动 SECTION 1 |
| **打印保真** | 2.7 起导出直接对当前窗口 `printToPDF()`，屏幕规则原样生效；`@media print` 只补 `print-color-adjust`，不再重写整份镜像 |
| **无死规则** | 选择器必须命中真实 DOM。CodeMirror 6 不产出 `#write` / `.ProseMirror` / `<h1>`，这类规则一律禁止 |

### 1.2 与现有体系的关系

```
┌─────────────────────────────────────────────────┐
│  themes/template.css        用户主题 (本范式)     │
│  :root 变量 + .cm-md-* 微调                      │
├─────────────────────────────────────────────────┤
│  base.css                   主题变量默认值        │
│  :root, body.theme-light 定义 14 个活变量         │
├─────────────────────────────────────────────────┤
│  editor-preview.css         CM6 排版层            │
│  消费活变量；.cm-md-* 行类与装饰类                 │
├─────────────────────────────────────────────────┤
│  Pele 图表引擎（SVG 内嵌 var(--pele-*)）          │
│  主题覆盖 --pele-* 即可换配色，换装即时生效        │
├─────────────────────────────────────────────────┤
│  document.css               HTML/PDF 导出样式     │
│  作用域 .colamd-document，消费同一批变量           │
└─────────────────────────────────────────────────┘
```

**关键约束**：主题文件的根块必须是 `:root`。编辑器 DOM 里没有语义元素，标题是带类的一行、引用与代码块是每行一个 `div`，选择器只能使用 `.cm-md-*` 钩子。图表配色通过 `--pele-*` 变量，不写 SVG 选择器。

---

## 2. 设计规范 (Design Specification)

本节定义可被 AI Agent 程序化验证的强制性设计约束。每条规则包含唯一 ID、约束级别（MUST / MUST NOT / SHOULD / SHOULD NOT）、验证方法和设计理由。

> 规则中的 `--seed-*` 是**生成器**的输入令牌。手写主题只写语义变量时，按等价关系校验：`--seed-ink` ↔ `--text-color`、`--seed-surface` ↔ `--bg-color`、`--seed-panel` ↔ `--code-bg`、`--seed-ink-muted` ↔ `--text-secondary`、`--seed-accent` ↔ `--link-color`。

### 2.1 色彩空间规范

#### 2.1.1 对比度约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **CR-01** | MUST | 正文色 (`--seed-ink`) 与页面底色 (`--seed-surface`) 对比度 ≥ 7:1（WCAG AAA） | `relativeLuminance(ink, surface) ≥ 7.0` |
| **CR-02** | MUST | 次要文字 (`--seed-ink-muted`) 与页面底色对比度 ≥ 4.5:1（WCAG AA） | `relativeLuminance(muted, surface) ≥ 4.5` |
| **CR-03** | MUST | 弱化文字 (`--seed-ink-dim`) 与页面底色对比度 ≥ 3:1（WCAG AA large） | `relativeLuminance(dim, surface) ≥ 3.0` |
| **CR-04** | MUST | 点缀色 (`--seed-accent`) 与页面底色对比度 ≥ 4.5:1（用于链接/强调文字时） | `relativeLuminance(accent, surface) ≥ 4.5` |
| **CR-05** | SHOULD | 内联代码背景 (`--seed-panel`) 与页面底色区分度 ≥ 1.5:1 | `relativeLuminance(panel, surface) ≥ 1.5` 或 `≤ 0.67` |
| **CR-06** | MUST NOT | 禁止正文色与页面底色对比度 < 4.5:1 | `relativeLuminance(ink, surface) ≥ 4.5` |

**WCAG 相对亮度计算公式**：

```
relativeLuminance(hex) = 0.2126 * R + 0.7152 * G + 0.0722 * B
  其中 R/G/B = linearize(channel / 255)
  linearize(c) = c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4

contrastRatio(L1, L2) = (max(L1,L2) + 0.05) / (min(L1,L2) + 0.05)
```

#### 2.1.2 色相协调规则

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **HR-01** | SHOULD | 浅色主题中，点缀色优先选用暖色（红/橙/棕）或冷色（蓝/靛/绿），避免中性灰作为点缀色 | 检查 `--seed-accent` 的 HSL 饱和度 S ≥ 0.30 |
| **HR-02** | SHOULD | 深色主题中，点缀色亮度适当提高（HSL 的 L ≥ 0.50），避免深色背景上点缀色不可见 | 检查 accent-L 值 |
| **HR-03** | MUST NOT | 禁止同时使用 ≥ 3 个不同色相的饱和色作为功能色。点缀色应只有 1 个色相族 | 检查色板中饱和度 > 0.3 的色相数量 ≤ 2 |

#### 2.1.3 饱和度与明度约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **SL-01** | MUST | 页面底色 (`--seed-surface`) 饱和度 ≤ 0.05（近白或近黑，不偏色） | 检查 HSL S 值 |
| **SL-02** | MUST NOT | 禁止大面积色块（代码区 `--seed-panel`、引用块 `--seed-panel-alt`）饱和度 > 0.10 | 检查 HSL S ≤ 0.10 |
| **SL-03** | SHOULD | 表面色三层 (`surface → panel → panel-alt`) 保持同色相（H 偏差 ≤ 5°），仅明度递减 | 检查 HSL H 差值 ≤ 5° |
| **SL-04** | MUST | 浅色主题：`L(surface) > L(panel) > L(panel-alt)`；深色主题反之 | 检查 L 单调性 |

#### 2.1.4 点缀色面积约束

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **AR-01** | SHOULD | 点缀色覆盖面积 ≤ 页面可视面积的 10%（用于链接、Mermaid 节点边框、表头底线、引用块竖线等） |
| **AR-02** | MUST NOT | 禁止将点缀色用作大面积背景色（页面底色、代码块背景、表格全局背景） |

#### 2.1.5 中性灰轴约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **NT-01** | MUST | `--seed-ink` / `--seed-ink-muted` / `--seed-ink-dim` 必须位于同一色相轴（HSL H 偏差 ≤ 3°），仅明度变化 | 检查 H 差值 |
| **NT-02** | MUST | `--seed-border` 与 `--seed-panel` 明度差 ≥ 0.08，确保边框可见 | `abs(L(border) - L(panel)) ≥ 0.08` |
| **NT-03** | SHOULD | `--seed-border` 只能使用中性灰（HSL S ≤ 0.05），禁止使用有色边框 | 检查 S ≤ 0.05 |

### 2.2 字体搭配规范

#### 2.2.1 字体数量与分类

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **FP-01** | MUST | 主题使用的字体家族总数 ≤ 3（正文 1、标题 1、等宽 1） |
| **FP-02** | SHOULD | 标题字体（写在 `.cm-md-atxheading*` 上）与 `--font-body` 须有分类对比：一个无衬线、一个衬线；或同分类但字重/字宽显著不同 |
| **FP-03** | MUST | `--font-mono` 必须是等宽字体（monospace），禁止将比例字体用于代码 |
| **FP-04** | SHOULD | 图表文字默认继承 `--font-body`，需要等宽时继承 `--font-mono`；不再有 `--font-mermaid` |

#### 2.2.2 字体分类搭配矩阵

| 正文字体分类 | 推荐标题字体分类 | 搭配效果 |
|-------------|----------------|---------|
| Sans-serif | Sans-serif（更粗字重） | 现代、Swiss、技术文档 |
| Serif | Sans-serif | 经典学术、优雅对比 |
| Serif | Serif（更粗字重） | 传统印刷、书籍风格 |
| Sans-serif | Serif | 少见，通常反直觉 |

**禁止搭配**：正文与标题使用同一字体的相同字重（无任何区分度）。

#### 2.2.3 字号倍率约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **FS-01** | MUST | `--font-scale-h1` ≥ 1.75（主标题至少为正文的 1.75 倍） | 检查倍率值 |
| **FS-02** | MUST | 标题倍率严格递减：`h1 > h2 > h3 > h4 > h5 > h6` | 检查单调性 |
| **FS-03** | SHOULD | 正文字号 `--font-size-root` ∈ [14px, 18px] | 检查范围 |
| **FS-04** | SHOULD | Mermaid 字号 `--font-size-mermaid` ∈ [11px, 14px] | 检查范围 |
| **FS-05** | SHOULD | 标题行高 `--line-height-heading` ∈ [1.15, 1.4]，小于正文行高 | `heading < body` |

#### 2.2.4 字体栈构造规则

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **FS-06** | MUST | 每个字体栈必须以通用字体族（`serif` / `sans-serif` / `monospace`）结尾 |
| **FS-07** | MUST | 字体栈中至少包含 1 个中文字体（覆盖 CJK 字符）和 1 个西文字体 |
| **FS-08** | SHOULD | 字体栈中同一字体族的不同字重变体（如 "Inter" 和 "Inter Display"）只保留 1 个 |

### 2.3 表面/背景层次规范

#### 2.3.1 明度阶梯约束

页面视觉层次依赖三层表面的明度差异。

| Rule ID | 级别 | 规则 | 浅色主题 | 深色主题 |
|---------|------|------|---------|---------|
| **SH-01** | MUST | 相邻表面层明度差 ≥ 0.04 | `L(surface) - L(panel) ≥ 0.04` | `L(panel) - L(surface) ≥ 0.04` |
| **SH-02** | MUST | 代码块底色 (`--code-block-bg` 或 `--seed-panel-alt`) 与页面底色明度差 ≥ 0.06，确保代码区域肉眼可辨 | `abs(L(block) - L(surface)) ≥ 0.06` |
| **SH-03** | SHOULD | 三层表面 `surface → panel → panel-alt` 的明度差均匀（相邻层差值偏差 ≤ 50%） | `ratio(d1,d2) ≤ 1.5` |

#### 2.3.2 各语义表面最低对比度

| 语义角色 | 对应变量 | 与页面底色的最低对比度 |
|----------|---------|---------------------|
| 代码块背景 | `--code-block-bg` | 1.2:1（肉眼可辨即可，不宜过强） |
| 内联代码背景 | `--code-bg` | 1.15:1 |
| 引用块背景 | `--blockquote-bg` | 1.15:1 |
| 表头背景 | `--table-header-bg` | 1.5:1（需明显区分） |
| Mermaid 节点填充 | `--mermaid-node-fill` | 1.2:1 |
| Mermaid 聚类填充 | `--mermaid-cluster-fill` | 1.1:1（极浅即可） |

### 2.4 线条/边框规范

#### 2.4.1 边框色与底色关系

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **BD-01** | MUST | 边框色 (`--seed-border`) 必须比其所在表面色暗：浅色主题 `L(border) < L(surface)`，深色主题反之 |
| **BD-02** | SHOULD | 强调边框 (`--seed-border-strong`) 比普通边框深 ≥ 0.15 明度差 |
| **BD-03** | SHOULD | Mermaid 节点描边 (`--mermaid-node-stroke`) 与节点填充 (`--mermaid-node-fill`) 对比度 ≥ 2:1 |

#### 2.4.2 边框宽度层级

| 用途 | 推荐宽度 | 说明 |
|------|---------|------|
| 分割线 (hr) | 1px | 最细，仅起分隔作用 |
| 表格内边框 (td) | 1px | 细线，不抢内容 |
| Mermaid 节点描边 | 1.5px | 略粗，确保图表清晰 |
| 引用块左侧竖线 | 4px | 最粗，视觉锚点 |
| 表头底线 | 2px | 区分表头与表体 |

### 2.5 语义色角色映射规范

#### 2.5.1 强制映射表 (Mandatory)

以下映射**必须**成立。变量值必须直接或间接来自种子色板。

| 语义变量 | 必须映射到 | 说明 |
|----------|-----------|------|
| `--bg-color` | `var(--seed-surface)` | 页面底色 = 最浅表面 |
| `--text-color` | `var(--seed-ink)` | 正文色 = 最深文字 |
| `--heading-color` | `var(--seed-ink)` | 标题色 = 正文色（统一） |
| `--link-color` | `var(--seed-accent)` | 链接色 = 点缀色 |
| `--accent-color` | `var(--seed-accent)` | 全局强调色 = 点缀色 |
| `--border-color` | `var(--seed-border)` | 边框色 = 中性灰 |
| `--code-bg` | `var(--seed-panel)` | 内联代码背景 = 中间表面 |
| `--code-block-bg` | `var(--seed-panel-alt)` | 代码块背景 = 最深表面 |
| `--blockquote-bg` | `var(--seed-panel)` | 引用块背景 = 中间表面 |
| `--blockquote-border` | `var(--seed-ink)` 或 `var(--seed-accent)` | 引用竖线 = 正文色或点缀色 |
| `--table-header-bg` | `var(--seed-panel)` 或 `var(--seed-ink)` | 表头 = 浅底或黑底白字 |
| `--selection-bg` | `accent color + alpha 0.10~0.20` | 选区 = 点缀色半透明 |

#### 2.5.2 禁止的映射 (Forbidden)

| Rule ID | 级别 | 禁止项 |
|---------|------|--------|
| **MP-01** | MUST NOT | `--text-color` 映射到 ⾮ `--seed-ink` 或 `--seed-ink-muted` 的其他来源 |
| **MP-02** | MUST NOT | `--bg-color` 映射到 ⾮ `--seed-surface` 的其他来源 |
| **MP-03** | MUST NOT | `--border-color` 映射到有彩色（非中性灰），HSL S > 0.05 |
| **MP-04** | MUST NOT | `--code-bg` 与 `--bg-color` 使用同一值（代码区不可见） |
| **MP-05** | MUST NOT | `--table-header-bg` 同时兼具浅底 + 浅字（表头必须可读） |

### 2.6 规则优先级与冲突解决

当多条规则冲突时，按以下优先级裁决：

```
1. MUST NOT  > 2. MUST  > 3. SHOULD NOT  > 4. SHOULD
```

- 任何 MUST NOT 规则被违反 → 主题**拒绝**（不合规）
- 任何 MUST 规则被违反 → 主题**拒绝**
- SHOULD NOT 被违反 → **警告**，需人工审核
- SHOULD 被违反 → **建议**，不阻止使用

示例：若某个点缀色满足 HR-01（SHOULD），但违反 CR-04（MUST），则主题被拒绝。

---

## 3. 变量体系

### 3.1 分层架构

```
SECTION 1  设计令牌 (Design Tokens)     ← 用户修改
SECTION 2  编辑器 DOM 选择器 (.cm-md-*) ← 可选微调
SECTION 3  导出 HTML (.colamd-document) ← 导出件配色
SECTION 4  打印 (media print)           ← 保真补充
```

**变量根块必须是 `:root`**，写在 `body.theme-*` 里编辑器继承不到。变量分三层（活 / 死 / 种子）：

- **活变量**：`--bg-color --text-color --text-secondary --text-muted --border-color --link-color --code-bg --code-block-bg --code-block-text --blockquote-border --blockquote-bg --table-header-bg --selection-bg --highlight-bg --font-body --font-mono --editor-font-size --editor-column-width` + `--pele-*`（9 个）。
- **死变量（禁止写）**：`--surface-color --surface-alt --text-dim --heading-color --accent-color --accent-dark --accent-light --hr-color --code-color --code-block-color --table-border --scrollbar-thumb* --mermaid-* --radius-* --content-width --font-size-root --font-scale-* --line-height-* --font-heading --font-code --font-mermaid --font-size-mermaid`。
- **种子令牌**：`--seed-*`（生成器输入，手写主题可不写）。

### 3.2 设计令牌：种子色板

主题的视觉基调由 11 个种子令牌（4 组颜色 + 3 组文字 + 2 组边框）决定。手写主题可跳过这一层，直接写语义变量。

```
--seed-accent         点缀色（链接、强调、Mermaid 高亮）
  ├── --seed-accent-light   浅变体（用作背景）
  └── --seed-accent-dark    深变体（用作 hover / 文字）

--seed-surface        页面底色（最浅层）
--seed-panel          卡片/代码区底色（中间层）
--seed-panel-alt      表头/引用块底色（最深表面层）

--seed-ink            正文/标题色（最深文字）
--seed-ink-muted      次要文字色
--seed-ink-dim        弱化/禁用文字色

--seed-border         常规边框色
--seed-border-strong  强调边框色
```

**配色约束**：

| 主题类型 | 表面色关系 | 文字色关系 |
|----------|-----------|-----------|
| 浅色主题 | `surface` < `panel` < `panel-alt` (亮度递减) | `ink` > `muted` > `dim` (亮度递增) |
| 深色主题 | `surface` > `panel` > `panel-alt` (亮度递增) | `ink` < `muted` < `dim` (亮度递减) |
| 点缀色面积 | ≤ 页面 10%（链接 + 强调 + Mermaid 节点边框） | |

### 3.3 设计令牌：字体系统

```
--font-body      正文字体栈（活变量，写在 :root）
--font-mono      等宽字体栈（活变量，代码/公式/图表）
标题字体栈       写在 .cm-md-atxheading* 上（--font-heading 已死）
```

**字体栈构造规范**：
1. 西文字体在前（Windows / macOS / Linux 逐一覆盖）
2. 中文字体居中（Serif 或 Sans Serif 按主题风格选择）
3. 通用后备字体在末（`serif` / `sans-serif` / `monospace`）

### 3.4 语义映射规则

生成器把 11 个种子令牌映射为 2.7 的活变量（语义变量直接引用种子，不引入新色值）：

| 活变量 | 映射来源 | 消费者 |
|--------|---------|--------|
| `--bg-color` | `--seed-surface` | 页面背景 |
| `--text-color` | `--seed-ink` | 正文颜色 |
| `--text-secondary` | `--seed-ink-muted` | 次级文字：引用、标签 |
| `--text-muted` | `--seed-ink-dim` | 压淡文字：行号、链接地址 |
| `--border-color` | `--seed-border` | 分隔线、表格边框 |
| `--link-color` | `--seed-accent` | 超链接、PeLe accent |
| `--code-bg` | `--seed-panel` | 内联代码背景 |
| `--code-block-bg` | `--seed-panel-alt` | 代码块背景 / Pele 画布底 |
| `--code-block-text` | 派生（见下） | 代码块文字 / Pele 前景 |
| `--blockquote-border` | `--seed-accent` | 引用块左竖线 |
| `--blockquote-bg` | `--seed-panel` | 引用块背景 |
| `--table-header-bg` | `--seed-panel` | 表头背景 |
| `--selection-bg` | `accent + 0.18 alpha` | 选区高亮 |
| `--highlight-bg` | `accent + 0.18 alpha` | `==高亮==` |
| `--font-body` | `fontBody` | 正文 |
| `--font-mono` | `fontCode` | 代码 / 图表 |
| `--editor-font-size` | `fontSizeRoot` | 编辑字号 |
| `--editor-column-width` | `contentWidth` | 阅读列宽 |

**`--code-block-text` 派生规则**：从 `--code-block-bg` 出发，在白、浅灰、`--bg-color`、`--text-color` 四档里挑对比度最高者 —— 深色代码块自动拿浅色文字，浅色代码块拿正文色。不得硬编码一套明暗两套的猜测逻辑。

**Pele 图表**：`--pele-*` 九个变量全部可省略，缺省值由 `--code-block-bg` / `--code-block-text` / `--link-color` 经 `color-mix()` 推导（对比度是算出来的）。主题只需在 `:root` 覆盖需要的档位。

### 3.5 Pele 图表 9 变量

上游 2.7.7 起图表引擎换成 Pele：SVG 内嵌 `var(--pele-*)`，在图落进的文档里取值，换主题即时生效，不需要重画。`--mermaid-*` 全部失效。

| 变量 | 画的是什么 | 缺省取值 |
|------|-----------|---------|
| `--pele-bg` | 画布底色 | `--code-block-bg` |
| `--pele-fg` | 文字 | `--code-block-text` |
| `--pele-muted` | 弱化文字 | 文字色与底色 70% 混合 |
| `--pele-line` | 连线与箭头 | `--code-block-text` |
| `--pele-surface` | 节点填充 | 文字色 18% 与底色混合 |
| `--pele-surface-alt` | 次级节点填充 | 文字色 28% 与底色混合 |
| `--pele-border` | 节点描边 | 文字色 45% 与底色混合 |
| `--pele-accent` | 强调色 | `--link-color` |
| `--pele-radius` | 圆角 | `6px` |

**规则**：
- 声明在 `:root` 上，写进别的选择器等于没写。
- 不必写齐：每个变量独立生效，缺省值本身从代码块底色与字色推导。
- 图直接画在代码块背景上：配色贴着 `--code-block-bg` 调。
- Word 导出不走变量（Pele 变量到不了 `<img>` 的 data URL），会内联一套固定浅色值。

---

## 4. 模块化规则

### 4.1 继承而非重写

内置系统已处理的样式，主题文件**禁止**重写其选择器。

| 内置文件 | 已处理内容 | 主题禁止 |
|----------|-----------|---------|
| `base.css` | 活变量默认值（`:root, body.theme-light`） | 在 `body.theme-*` 里重定义主题变量 |
| `editor-preview.css` | `.cm-content` / `.cm-line` 的字体、字号、行高、列宽、内边距基线 | 重写已被变量覆盖的排版规则；给 `.cm-line` 之外的元素加行内边距 |
| `document.css` | `.colamd-document` 下 h1/p/ul/pre/table 的结构排版 | 重写导出件的结构规则（只补配色） |

### 4.2 允许的微调选择器

以下选择器**允许**在主题中定义（内置系统未覆盖或不满足个性化需求）：

| 允许的选择器 | 用途 | 约束 |
|-------------|------|------|
| `#editor .cm-content` | 正文字体、行高 | 引用 `var(--font-body)` |
| `#editor .cm-content .cm-md-atxheading1..6` | 标题字体/颜色/字号/底线 | 字号用 `em`，不得用 `pt` |
| `#editor .cm-content .cm-md-strong/.cm-md-em/.cm-md-strike/.cm-md-inlinecode/.cm-md-highlight` | 行内样式 | 引用活变量 |
| `#editor .cm-content .cm-md-link/.cm-md-url` | 链接文字与地址 | 引用 `var(--link-color)` / `var(--text-muted)` |
| `#editor .cm-content .cm-md-blockquote` | 引用块底色、左竖线 | **只给左右 padding** |
| `#editor .cm-content .cm-md-codeblock(-first/-last)` | 代码块底色、文字、首末行圆角 | **只给左右 padding** |
| `#editor .cm-content .cm-md-table-widget th/td` | 表头底色、单元格边框 | 引用活变量 |
| `#editor .cm-content .cm-md-hr` | 分隔线颜色 | 引用 `var(--border-color)` |
| `#editor .cm-content .cm-md-li-0..6` | 列表层级样式 | 不得改纵向间距 |
| `.colamd-document ...` | 导出件配色 | 只补配色，不重写结构 |
| `@media print` | 打印保真 | 只补 `print-color-adjust`，不写镜像 |

### 4.3 度量指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 主题文件总行数 | ≤ 300 行 | 含注释和空行 |
| 死选择器数量 | 0 | `#write` / `.ProseMirror` / `body.theme-custom` / `.mermaid-*` 一律禁止 |
| 死变量数量 | 0 | `--mermaid-*` / `--radius-*` / `--font-size-root` 等一律禁止 |
| `pt` 单位数量 | 0 | 统一用 `px` / `em` / `rem` |
| 根块位置 | `:root` | 变量必须写在 `:root` |
| 用户需修改的变量数 | ≤ 18 | 集中在 SECTION 1 |

---

## 5. 文件结构规范

### 5.1 必须的 SECTION

```
SECTION 1  Design Tokens — :root 活变量（用户编辑区）
  ├── 1.1 语义色（14 个）
  ├── 1.2 字体与度量（4 个）
  └── 1.3 Pele 图表（9 个，可选）

SECTION 2  编辑器 DOM — #editor .cm-content + .cm-md-*
  ├── 2.1 正文与标题
  ├── 2.2 行内格式
  ├── 2.3 引用块 / 代码块
  ├── 2.4 表格 / 分隔线
  └── 2.5 首行缩进与排除

SECTION 3  导出 HTML — .colamd-document（只补配色）

SECTION 4  @media print（只补 print-color-adjust）
```

### 5.2 选择器规则

| 规则 | 说明 |
|------|------|
| 根选择器 | 变量定义在 `:root { }` 内 |
| 编辑器选择器 | 一律 `#editor .cm-content .cm-md-*`（两个类才压得住 CodeMirror baseTheme） |
| 引用/代码块内边距 | 只允许 `padding-left` / `padding-right`，禁止纵向 padding |
| `!important` | 禁止使用（`@media print` 里也只用于 `print-color-adjust`） |
| `pt` 单位 | 禁止使用，统一 `px` / `em` / `rem` |
| 层叠顺序 | 变量定义块在前，选择器规则块在后 |
| 导出件 | `.colamd-document` 只补配色；结构排版由 `document.css` 提供 |

### 5.3 注释规范

```css
/* ── X.X 功能描述（中文）── */
/* 用于 xxx 场景的 xxx 变量 */
--variable-name: value;

/* ═══════════════════  分隔大节  ═══════════════════ */
```

---

## 6. 打印保真规范 (Print Fidelity)

### 6.1 核心约束

2.7 起 PDF 导出直接对**当前窗口** `printToPDF()`：屏幕上的主题 CSS 原样生效，Chromium 不再拿到一份独立的设计。因此：

- **不写镜像**：不再把每条屏幕规则复制到 `@media print` 加 `!important`。
- **不重声明变量**：`@media print` 里重新注入 `--seed-*` 的旧做法已删除。
- **只补保真**：`@media print` 里保留 `print-color-adjust: exact`，让背景色与自定义颜色进入 PDF。

### 6.2 打印块

```css
@media print {
  html,
  body {
    background: var(--bg-color);
    color: var(--text-color);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

语义标签的导出件（`.colamd-document`）由 `document.css` 提供结构，主题只补配色，打印时同样自动生效。

### 6.3 打印验证清单

- [ ] 页面底色与屏幕一致（非灰底）
- [ ] 标题颜色与屏幕一致
- [ ] 内联代码、代码块底色存在
- [ ] 引用块底色与左竖线存在
- [ ] 表头底色存在
- [ ] Pele 图表配色与屏幕一致
- [ ] 链接颜色不是浏览器默认蓝
- [ ] 导出件中没有 `#write` / `.ProseMirror` 时期的空规则

---

## 7. AI Agent 编写指南

### 7.1 创建新主题

1. 复制 `themes/template.css` 为基础
2. 确定配色方向（浅色/深色/暖调/冷调/学术）
3. 填写 SECTION 1 的 14 个语义色 + `--font-body` / `--font-mono`
4. 需要微调时只改 SECTION 2 的 `.cm-md-*` 规则
5. 运行 `colamd-themes validate <file>` 确认 `:root`、死选择器、死变量、`pt` 与纵向 padding 全部通过
6. 保存，导入测试

### 7.2 修改现有主题

1. 只修改 `:root` 里的语义变量与 Pele 变量
2. 选择器层没有对应变量时才加 `.cm-md-*` 规则
3. 主题文件里出现 `--mermaid-*`、`--font-size-root`、`#write`，一律视为未迁移

### 7.3 禁止操作

- 在 `:root` 之外定义主题变量
- 使用死变量（`--surface-color` / `--heading-color` / `--accent-color` / `--hr-color` / `--code-color` / `--font-size-root` / `--content-width` / `--radius-*` / `--mermaid-*` …）
- 使用死选择器（`#write` / `.ProseMirror` / `body.theme-custom` / `.mermaid-block`）
- 给 `.cm-md-blockquote` / `.cm-md-codeblock` 加纵向 padding
- 使用 `pt` 单位
- 使用 `!important`（`@media print` 的 `print-color-adjust` 除外）
- 写 Mermaid SVG 选择器或 Pele 内部节点选择器（只覆盖 `--pele-*`）

---

## 8. 现有主题对标

| 主题 | 行数 | 范式符合度 | 迁移建议 |
|------|------|-----------|---------|
| 上游 `resources/templates/themes/*.css`（5 套） | 50~90 | 高（2.7 已移植范例） | 作为写法基准直接对照 |
| `academic-paper.css` | ~1300 | 低（v3 选择器全量） | 按 SECTION 重写，保留学术排版规则到 `.cm-md-*` |
| `guizang.css` / `elegant.css` / `forest-ink.css` / `pixso-design.css` | ~700~750 | 低（`#write` / `.ProseMirror`） | 全量迁移至 `.cm-md-*`，目标 ~200 行 |
| `word-contract.css` | — | 低（v3 契约） | 全量迁移，保留合同专用规则 |

---

## 9. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v4.0 | 2026-10-23 | 对齐 ColaMD Extend 2.7（CodeMirror 6 + Pele）：根块改 `:root`；活/死变量清单；`.cm-md-*` 选择器取代 `#write`/`.ProseMirror`；Mermaid 20 变量 → Pele 9 变量；新增 `.colamd-document` 导出段；打印改为「不写镜像、只补保真」；新增死选择器/死变量/`pt`/纵向 padding 校验 |
| v3.2 | 2026-05-23 | 新增 Section 2「设计规范」：色彩空间、字体搭配、表面层次、线条边框的强制性约束（含 Rule ID、WCAG 对比度公式、色彩协调矩阵），支持 AI Agent 程序化验证 |
| v3.1 | 2026-05-23 | 新增「打印保真」原则与完整 `@media print` 规范（Section 6） |
| v3.0 | 2026-05-23 | 初始范式定义。提出种子色板 + 语义映射 + 内置继承的三层架构 |
