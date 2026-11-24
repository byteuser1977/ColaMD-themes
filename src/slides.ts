/**
 * PPT / Slides token layer — ColaMD-extend 2.7.13+ slide layout system
 * (token inventory as of 2.8.0).
 *
 * Upstream `slides.css` defines the `--slide-*` tokens on `:root` with
 * magazine-style defaults; built-in themes override them via `body.theme-*`
 * presets (Notion → sans, Writer → mono). Custom theme CSS loads *after*
 * slides.css in the app, so a custom theme can redefine the same tokens on
 * `:root` (later rule wins at equal specificity). These tokens are NOT part
 * of the document contract's live variables — they are a parallel family
 * consumed only by the presentation/print-slide scopes, which is why the
 * validators treat them separately.
 *
 * A generated theme carries the "brand voice" only: title font, mono font,
 * title weight — the layout scale (size ladder, page padding) stays at the
 * upstream defaults so slides keep their proportions across themes.
 */

import type { ThemeStyle } from "./models.js";

/**
 * Every `--slide-*` token declared in upstream slides.css `:root` (2.8.0).
 * The slide print layout pins the viewport-derived ones (--slide-page-pad-x,
 * --slide-body-size, --slide-kicker-size, --slide-chrome-pad-y,
 * --slide-chrome-logo-h, --slide-foot-pad-y, --slide-img-max-h,
 * --slide-figure-max-h) to fixed px on `body.slides-printing`, so theme
 * overrides of those tokens only apply in the presenting view — the paper
 * always prints at the 1920×1080 design space.
 */
export const SLIDE_TOKENS: readonly string[] = Object.freeze([
  "--slide-serif",
  "--slide-mono",
  "--slide-title-font",
  "--slide-title-size",
  "--slide-title-weight",
  "--slide-subhead-weight",
  "--slide-title-tracking",
  "--slide-title-line-height",
  "--slide-cover-title-size",
  "--slide-cover-title-line-height",
  "--slide-cover-title-tracking",
  "--slide-section-title-size",
  "--slide-closing-title-size",
  "--slide-lead-size",
  "--slide-kicker-size",
  "--slide-kicker-tracking",
  "--slide-kicker-transform",
  "--slide-chrome-opacity",
  "--slide-chrome-transform",
  "--slide-kpi-number-size",
  "--slide-quote-size",
  "--slide-page-pad-x",
  "--slide-page-top-pad",
  "--slide-body-size",
  "--slide-chrome-pad-y",
  "--slide-chrome-logo-h",
  "--slide-foot-pad-y",
  "--slide-img-max-h",
  "--slide-figure-max-h",
  "--slide-cover-text-align",
  "--slide-cover-lead-inline",
]);

export type SlidePreset = "serif" | "sans" | "mono";

export const SLIDE_PRESET_IDS: readonly SlidePreset[] = Object.freeze(["serif", "sans", "mono"]);

/**
 * Preset "voices" mirroring upstream built-in theme overrides in slides.css:
 *  - serif: upstream magazine default (no extra overrides)
 *  - sans:  body.theme-notion  (sans titles, centered cover, small tracking)
 *  - mono:  body.theme-writer  (mono titles, weight 500, zero tracking)
 */
export const SLIDE_PRESETS: Record<SlidePreset, Record<string, string>> = {
  serif: {},
  sans: {
    "--slide-title-weight": "600",
    "--slide-title-tracking": "-0.02em",
    "--slide-cover-title-size": "5.4em",
    "--slide-section-title-size": "4.4em",
    "--slide-kicker-size": "clamp(10px, 0.64vw, 13px)",
    "--slide-kicker-tracking": "0.16em",
    "--slide-kicker-transform": "none",
    "--slide-chrome-transform": "none",
    "--slide-chrome-opacity": "0.55",
    "--slide-cover-text-align": "center",
    "--slide-cover-lead-inline": "auto",
  },
  mono: {
    "--slide-title-weight": "500",
    "--slide-title-tracking": "0",
    "--slide-cover-title-size": "5.2em",
    "--slide-section-title-size": "4.2em",
    "--slide-kicker-tracking": "0.18em",
    "--slide-kicker-transform": "none",
  },
};

/** CJK families we consider a sufficient CJK fallback in a font stack. */
const CJK_FONT_RE =
  /[\u4e00-\u9fff]|Songti|SimSun|STSong|STZhongsong|Noto (?:Serif|Sans) (?:CJK|SC)|Source Han (?:Serif|Sans)|思源|宋体|黑体|PingFang|Microsoft YaHei|Hiragino Sans GB/i;

function endsWithGeneric(stack: string): boolean {
  return /(?:^|,\s*)(?:serif|sans-serif|monospace|cursive|fantasy|system-ui)\s*$/i.test(stack.trim());
}

function genericFor(preset: SlidePreset): string {
  return preset === "mono" ? "monospace" : preset === "sans" ? "sans-serif" : "serif";
}

/**
 * Make a brand font stack safe for the slide token layer: guarantee a CJK
 * family for title voices (Chinese titles fall through to Georgia otherwise)
 * and a trailing generic family (contract font rule). Mono stacks skip the
 * CJK append — there is no standard CJK mono; upstream lets chrome CJK fall
 * back to the system font.
 */
function ensureFontStack(stack: string, preset: SlidePreset): string {
  let out = stack.trim().replace(/,\s*$/, "");
  if (preset !== "mono" && !CJK_FONT_RE.test(out)) {
    out += preset === "sans"
      ? `, "PingFang SC", "Microsoft YaHei", "Noto Sans SC"`
      : `, "Songti SC", "Noto Serif SC", "SimSun"`;
  }
  if (!endsWithGeneric(out)) out += `, ${genericFor(preset)}`;
  return out;
}

function validWeight(value: string | undefined): string | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 100 && n <= 900 ? String(n) : null;
}

/**
 * Derive the theme's slide tokens: preset voice first, then the brand layer
 * (title font / mono font / title weight) from the extracted typography.
 * Returns tokens in SLIDE_TOKENS order for stable, compact template output.
 */
export function buildSlideTokens(style: ThemeStyle, preset: SlidePreset): Record<string, string> {
  const tokens: Record<string, string> = { ...SLIDE_PRESETS[preset] };

  // Brand mono voice: deck chrome / page numbers / labels.
  const fontCode = style.seedTypography?.fontCode?.trim();
  if (fontCode) tokens["--slide-mono"] = ensureFontStack(fontCode, "mono");

  // Brand title voice.
  const heading = style.seedTypography?.fontHeading?.trim();
  if (preset === "mono") {
    // Writer-style: titles speak in the mono voice.
    tokens["--slide-title-font"] = "var(--slide-mono)";
  } else if (heading) {
    tokens["--slide-title-font"] = ensureFontStack(heading, preset);
  } else {
    tokens["--slide-title-font"] = ensureFontStack(style.typography.headingFontFamily || style.typography.bodyFontFamily, preset);
  }

  // Brand weight (valid range only).
  const weight = validWeight(style.typography?.headingWeight ? String(style.typography.headingWeight) : undefined);
  if (weight) tokens["--slide-title-weight"] = weight;

  // Stable output order, only known tokens.
  const ordered: Record<string, string> = {};
  for (const name of SLIDE_TOKENS) {
    if (name in tokens) ordered[name] = tokens[name];
  }
  return ordered;
}

/** Parse a user-supplied preset id; returns null when unknown. */
export function parseSlidePreset(value: string | undefined): SlidePreset | null {
  if (!value) return "serif";
  const v = value.toLowerCase();
  return (SLIDE_PRESET_IDS as readonly string[]).includes(v) ? (v as SlidePreset) : null;
}

// ═══════════════════════════════════════════════════════════
// Full slide token derivation (per-layout PPT styling)
// ═══════════════════════════════════════════════════════════

const MOOD_BOLD = /bold|punchy|graphic|loud|energetic|playful|neon|cyber|retro|maximal|geeky|rebellious|sci-fi/i;
const MOOD_QUIET = /quiet|scholarly|calm|minimal|considered|soft|gentle|elegant|literary|patient|intelligent|intellectual/i;
const MOOD_TECH = /tech|geek|cyber|pixel|retro-tech|sci-fi|neon/i;

function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function reorderTokens(tokens: Record<string, string>): Record<string, string> {
  const ordered: Record<string, string> = {};
  for (const name of SLIDE_TOKENS) {
    if (name in tokens) ordered[name] = tokens[name];
  }
  return ordered;
}

/**
 * Derive the FULL slide token set for a theme: preset voice + brand layer
 * (via buildSlideTokens), then — when the source provided design hints —
 * per-layout overrides so each page type (cover / section / KPI / quote /
 * kicker / chrome / padding) carries the template's own typographic voice.
 * Without hints this degrades gracefully to buildSlideTokens output.
 */
export function buildFullSlideTokens(style: ThemeStyle, preset: SlidePreset): Record<string, string> {
  const tokens = buildSlideTokens(style, preset);
  const d = style.slideDesign;
  if (!d) return tokens;

  const moods = d.mood ?? [];
  const bold = moods.some((m) => MOOD_BOLD.test(m));
  const quiet = moods.some((m) => MOOD_QUIET.test(m));
  const tech = moods.some((m) => MOOD_TECH.test(m));
  const dark = d.scheme === "dark";

  // ── 标题阶梯：模板 display/body 比例 → 封面/章节/收尾/页标题字号 ──
  // 无字号阶梯信息时按气质取锚点：大胆海报 ≈ 10.5，安静编辑 ≈ 7.5
  const r = d.displayRatio && d.displayRatio > 2 ? d.displayRatio : bold ? 10.5 : 7.5;
  const cover = clampNum(r * 0.58, 4.6, 6.6);
  const titleTracking = bold ? "-0.03em" : quiet ? "-0.01em" : preset === "sans" ? "-0.02em" : "-0.015em";

  tokens["--slide-cover-title-size"] = `${cover.toFixed(2)}em`;
  tokens["--slide-cover-title-line-height"] = bold ? "0.95" : "1.05";
  tokens["--slide-cover-title-tracking"] = titleTracking;
  tokens["--slide-section-title-size"] = `${(cover * 0.82).toFixed(2)}em`;
  tokens["--slide-closing-title-size"] = `${(cover * 0.92).toFixed(2)}em`;
  tokens["--slide-title-size"] = `${clampNum(r * 0.3, 2.2, 3.1).toFixed(2)}em`;
  tokens["--slide-title-tracking"] = titleTracking;
  tokens["--slide-title-line-height"] = "1.12";
  tokens["--slide-subhead-weight"] = preset === "mono" ? "500" : bold ? "800" : "600";

  // ── 导语与 kicker ──
  const leadR = d.leadRatio && d.leadRatio > 1 ? d.leadRatio : 1.4;
  tokens["--slide-lead-size"] = `${clampNum(leadR * 0.92, 1.05, 1.6).toFixed(2)}em`;
  tokens["--slide-kicker-size"] = bold
    ? "clamp(11px, 0.72vw, 14px)"
    : quiet
      ? "clamp(9px, 0.6vw, 12px)"
      : "clamp(10px, 0.64vw, 13px)";
  tokens["--slide-kicker-tracking"] = preset === "mono" ? "0.18em" : quiet ? "0.12em" : "0.16em";
  // serif 上游默认即 uppercase；sans/mono 预设保持 none，仅科技/大胆气质改写
  if (preset === "serif" || tech || bold) tokens["--slide-kicker-transform"] = "uppercase";

  // ── 页眉页脚 chrome ──
  tokens["--slide-chrome-opacity"] = String(bold ? 0.75 : dark ? 0.45 : 0.6);
  if (preset === "serif" || tech) tokens["--slide-chrome-transform"] = "uppercase";

  // ── KPI 大字与引言 ──
  tokens["--slide-kpi-number-size"] = bold ? "4.8em" : "4.2em";
  tokens["--slide-quote-size"] = quiet ? "2.3em" : "2.1em";

  // ── 页面留白：density low → 大留白 ──
  tokens["--slide-page-pad-x"] = d.density === "low" ? "6.5vw" : d.density === "high" ? "4.5vw" : "5.5vw";
  tokens["--slide-page-top-pad"] = d.density === "low" ? "15vh" : "12vh";

  // serif 封面左对齐 + 导语内联（杂志式）；sans 封面居中来自预设，不覆盖
  if (preset === "serif") tokens["--slide-cover-lead-inline"] = "auto";

  return reorderTokens(tokens);
}
