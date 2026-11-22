# 主题目录（themes/）

> 本目录包含两类文件：**内置/历史主题**（`elegant.css`、`swiss-lemon-*` 等 23 个）
> 与 **v0.6.1 从 beautiful-html-templates 批量提取的 34 个幻灯片模板主题**（下表）。

## beautiful-html-templates 模板主题（34 个）

来源：`beautiful-html-templates/templates/*`（每个模板含 `template.html` + `template.json`）。
由 `colamd-themes from-html` 批量提取，遵守 ColaMD 2.7.13 契约（≤300 行、`:root` 活变量、
字体栈含中文字族并以 generic family 结尾），并带**全量按页类型定制的 PPT `--slide-*` 令牌**：
封面/章节/收页字号阶梯取自模板自身字号阶梯，页标题 / KPI / 引言 / kicker / chrome / 页边距
按模板气质（bold/quiet/tech）、密度与明暗调校。

使用方式（未注册，按文件路径引用）：

```bash
colamd-themes export-html doc.md -t themes/vellum.css -o out.html
```

在 ColaMD 应用（≥2.7.13）内：*主题 > 导入主题* 或将 `.css` 放入 `~/.colamd/themes/` 即可放映使用。

本目录所有主题均通过 `colamd-themes validate`。模板刻意保留的设计身份偏差（纸底/纸面
饱和度、装饰色对比度等）以文件内 `/* colamd-allow: SL-01, CR-04 */` 机器可读地声明，
批量校验与 CI 因此保持绿色，豁免项仍会在 `validate --json` 的 `waived` 中列出。

| slug | 名称 | 气质 | 预设 | 明暗 | 显示字体 | 正文字体 | surface | ink | accent |
|---|---|---|---|---|---|---|---|---|---|
| 8-bit-orbit | 8-Bit Orbit | retro-tech · playful · cyberpunk | sans | dark | Tektur | Chakra Petch | #0a0e27 | #f0a6ca | #f4d03f |
| biennale-yellow | Biennale Yellow | editorial · atmospheric · warm | serif | light | Instrument Serif | Archivo | #e9e5db | #1b2566 | #f1ee2e |
| block-frame | BlockFrame | bold · playful · graphic | sans | light | Space Grotesk | Inter | #ffffff | #fe90e8 | #ffdc8b |
| blue-professional | Blue Professional | professional · modern · calm | sans | light | Space Grotesk | Inter | #fdfae7 | #111111 | #1e2bfa |
| bold-poster | Bold Poster | bold · editorial · loud | serif | light | Shrikhand | Space Grotesk | #ffffff | #1c1410 | #d8000f |
| broadside | Broadside | editorial · dramatic · loud | serif | dark | Barlow | Barlow | #111111 | #f0ece5 | #e85d26 |
| capsule | Capsule | playful · modern · warm | serif | light | Bodoni Moda | Space Grotesk | #f5f5f0 | #1a1a1a | #8bb4f7 |
| cartesian | Cartesian | quiet · considered · elegant | serif | light | Playfair Display | Inter | #ede8e0 | #1a1a1a | #8a8178 |
| cobalt-grid | Cobalt Grid | editorial · design-research · studious | serif | light | Newsreader | Hanken Grotesk | #f0ebde | #1f2be0 | #2b579a |
| coral | Coral | bold · warm · modern | sans | mixed | Bebas Neue | Inter | #f5f0e8 | #1a1a1a | #e85d5d |
| creative-mode | Creative Mode | creative · confident · playful | sans | light | Archivo Black | Space Grotesk | #efe9d9 | #0f0f0f | #f5c518 |
| daisy-days | Daisy Days | cheerful · playful · warm | sans | light | Fredoka One | Quicksand | #f5f0e6 | #f7c8d4 | #fde68a |
| editorial-forest | Editorial Forest | editorial · quiet · considered | sans | mixed | - | - | #efe7d4 | #1a1a17 | #e89cb1 |
| editorial-tri-tone | Editorial Tri-Tone | editorial · warm · intentional | sans | mixed | Bricolage Grotesque | - | #f2d86a | #7a1f35 | #f2b6c6 |
| emerald-editorial | Emerald Editorial | editorial · considered · confident | serif | mixed | Bodoni Moda | - | #3cd896 | #0f1a5c | #3cd896 |
| grove | Grove | organic · considered · warm | serif | mixed | Playfair Display | Jost | #192b1b | #d4cfbf | #c8524a |
| long-table | Long Table | warm · intimate · modern | sans | light | Bricolage Grotesque | Fraunces | #faf1e2 | #b53d2a | #2b579a |
| mat | Mat | warm-modern · considered · tactile | sans | mixed | Bricolage Grotesque | DM Sans | #232e26 | #f0e8d2 | #c07030 |
| monochrome | Monochrome | restrained · literary · archival | serif | light | Lora | Jost | #fafadf | #1a1a16 | #1a1a16 |
| neo-grid-bold | Neo-Grid Bold | confident · punchy · editorial | serif | light | Space Grotesk | Space Grotesk | #ecece8 | #0a0a0a | #e6ff3d |
| peoples-platform | People's Platform (Block & Bold) | activist · loud · graphic | serif | light | Alfa Slab One | - | #f5f2ea | #0e0e14 | #f2a03a |
| pin-and-paper | Pin & Paper | crafted · handmade · warm | sans | light | Caveat | Space Grotesk | #efe56a | #1f3a8a | #efe56a |
| pink-script | Pink Script — After Hours | nocturnal · moody · intentional | serif | dark | DM Serif Display | Inter | #f5edf1 | #060507 | #ff66a8 |
| playful | Playful | warm · approachable · indie | sans | light | Syne | Space Grotesk | #f0c8a0 | #1a1a1a | #1a1a1a |
| raw-grid | Raw Grid | raw · punchy · energetic | sans | light | Segoe UI / system-ui | Segoe UI / system-ui | #ffffff | #f2d4cf | #2b579a |
| retro-windows | Retro Windows | nostalgic · retro · geeky | sans | light | Press Start 2P | MS Sans Serif | #c0c0c0 | #222222 | #000080 |
| retro-zine | Retro Zine | crafted · lo-fi · underground | sans | light | Bebas Neue | Space Grotesk | #c8b99a | #1a1a1a | #008f4d |
| sakura-chroma | Sakura Chroma | retro · playful · kawaii-tech | serif | light | Big Shoulders Display | Albert Sans | #f1e6cb | #3a2516 | #f0bc2a |
| scatterbrain | Scatterbrain | playful · creative · warm | sans | light | Shrikhand | Zilla Slab | #f7f5f0 | #2d2a26 | #ffe066 |
| signal | Signal | institutional · trustworthy · considered | serif | mixed | Source Serif 4 | DM Sans | #1c2644 | #e2dcd0 | #c8a870 |
| soft-editorial | Soft Editorial | literary · elegant · quiet | serif | light | Cormorant Garamond | Work Sans | #f2eedf | #2a241b | #d6dd63 |
| stencil-tablet | Stencil & Tablet | archival · earthy · tactile | serif | light | Bowlby One | Inter | #f4efe0 | #0a0a0a | #ee7a2e |
| studio | Studio | electric · bold · graphic | sans | dark | Barlow | Barlow | #1c1c1c | #f5d200 | #f5d200 |
| vellum | Vellum | scholarly · literary · considered | serif | dark | Cormorant Garamond | DM Sans | #2a3870 | #e8d85c | #3a7878 |

共 34 个主题。预设分布：
- **sans**: 17 个
- **serif**: 17 个

## 提取器说明（from-html）

- **颜色**：语义 token（`--bg`/`--text`/`--accent`…）精确匹配 → 子串变体（`--c-bg`/`--fg`/`--ink`…）→ 明度/饱和度启发式（明度排序出背景/前景，最饱和且与两端拉开距离的色作强调色）
- **字体**：template.json 的 display/body/mono + serif_cn/sans_cn 拼 CJK 回退，generic family 结尾（SLIDE-03）
- **调色板清洗**：`var()` 脏值与违反明度方向的派生色按背景-前景插值重推（SL-04 排序 / CR-02 ≥4.5:1 对比度）
- **PPT 预设**：按 display 字体自动判定（衬线名 → serif / 等宽 → mono / 其余 → sans）
- **高饱和设计**：部分模板（如 8-bit-orbit 的霓虹 void、vellum 的饱和深蓝）保留 SL-01/SL-02 饱和度范式警告——模板刻意气质，非契约错误
