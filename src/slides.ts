/**
 * PPT / Slides token layer — ColaMD-extend 2.7.13 slide layout system.
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

/** Every `--slide-*` token declared in upstream slides.css `:root` (2.7.13). */
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
  "--slide-page-top-pad-print",
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
