/**
 * 本地 HTML 文件提取器 — 在 UrlExtractor 的解析核心之上叠加结构化元数据。
 *
 * 设计目标：从本地 HTML 模板目录（template.html + template.json）提取主题。
 * - template.json 提供权威的字体（typography.display/body/mono）、名称、tagline、
 *   scheme（dark/light/mixed），其 palette 键名因模板而异（bg/fg/accent、
 *   neon_pink/deep_navy、coral/cream/ink …），不可靠，仅作参考。
 * - 颜色以 template.html `<style>` 中 `:root` 的 CSS 自定义属性为准：
 *   先按语义 token 名映射（--bg/--text/--accent …），失败时按明度/饱和度启发式
 *   分类出背景/前景/强调色。
 * - PPT 预设（serif/sans/mono）按 display 字体自动判定。
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as cheerio from "cheerio";
import { UrlExtractor } from "./url-extractor.js";
import type { ThemeStyle } from "../models.js";
import { normalizeThemeStyle, rgbToHsl } from "../color-utils.js";

interface TemplateMeta {
  slug?: string;
  name?: string;
  tagline?: string;
  palette?: Record<string, unknown>;
  typography?: {
    display?: string;
    body?: string;
    mono?: string;
    serif_cn?: string;
    sans_cn?: string;
  };
  scheme?: string;
  density?: string;
  formality?: string;
  mood?: string[];
}

/** 语义 token 名 → 角色映射（:root 自定义属性名按小写匹配） */
const SEMANTIC_BG = ["--bg", "--bg-color", "--background", "--canvas", "--surface", "--paper", "--void", "--base"];
const SEMANTIC_FG = ["--text", "--text-color", "--fg", "--foreground", "--ink", "--color-text"];
const SEMANTIC_ACCENT = ["--primary", "--accent", "--accent-color", "--brand", "--highlight", "--theme"];
const SEMANTIC_MUTED = ["--text-muted", "--muted", "--muted-color", "--fg-muted"];
const SEMANTIC_BORDER = ["--border", "--border-color", "--line"];

const SERIF_FONT_HINTS =
  /serif|garamond|cormorant|playfair|georgia|times|baskerville|didot|bodoni|merriweather|lora|crimson|spectral|bitter|vollkorn|cardo|charter|tiempos|goudy|caslon|minion|antiqua|gentium|slab|ruhl/i;
const MONO_FONT_HINTS = /\bmono\b|courier|consol|jetbrains|fira\s?code|source\s?code/i;

export class LocalHtmlExtractor extends UrlExtractor {
  canHandle(source: string): boolean {
    return /\.(html?|htm)$/i.test(source) && existsSync(source) && !/^https?:\/\//i.test(source);
  }

  async extract(source: string): Promise<ThemeStyle> {
    const html = readFileSync(source, "utf-8");
    const theme = await this.extractFromHtml(html, source);

    theme.sourceType = "local-html";
    this.applyTemplateMeta(theme, source);
    this.applyRootTokenColors(theme, source);
    this.sanitizePalette(theme);

    normalizeThemeStyle(theme);
    return theme;
  }

  /**
   * 清洗调色板：HTML/CSS 解析可能带入 `var(--x)` 等非 hex 值（下游 hexToRgb 会抛错）。
   * 无效值或不符合主题明度方向的值，替换为从背景/前景派生的混合色，
   * 保证生成管线拿到全 hex 且满足 SL-04 明度排序（暗色 surface < panel < panelAlt）的调色板。
   */
  private sanitizePalette(theme: ThemeStyle): void {
    const p = theme.palette;
    const bg = ensureHex(p.bgColor, "#ffffff");
    const fg = ensureHex(p.textColor, "#1a1a1a");
    const accent = ensureHex(p.accentColor, "#2563eb");
    const dark = luminance(bg) < 0.4;

    p.bgColor = bg;
    p.textColor = fg;
    p.accentColor = accent;
    p.headingColor = ensureHex(p.headingColor, fg);
    p.textMuted = this.mutedTextColor(fg, bg, dark);
    p.borderColor = mix(bg, fg, dark ? 0.32 : 0.3);
    p.codeColor = ensureHex(p.codeColor, fg);
    p.codeBg = mix(bg, fg, dark ? 0.1 : 0.07);
    p.codeBlockBg = mix(bg, fg, dark ? 0.2 : 0.15);
    p.codeBlockText = mix(mix(bg, fg, dark ? 0.2 : 0.15), fg, 0.85);
    p.tableHeaderBg = mix(bg, fg, dark ? 0.1 : 0.07);
    p.blockquoteBg = mix(bg, fg, dark ? 0.08 : 0.05);
    p.blockquoteBorder = ensureHex(p.blockquoteBorder, accent);
    p.selectionBg = ensureHex(p.selectionBg, accent);
  }

  /**
   * 次要文字色：保持前景色相（NT-01 色相轴约束），降低饱和度与明度差，
   * 并保证与背景的对比度 ≥ 4.5:1（CR-02 WCAG AA）。
   */
  private mutedTextColor(fg: string, bg: string, dark: boolean): string {
    const [h, s] = rgbToHsl(...hexToRgb(fg));
    let l = dark ? Math.min(0.82, Math.max(0.6, 0.62 + (1 - s) * 0.1)) : Math.max(0.32, Math.min(0.45, 0.4 - s * 0.05));
    let muted = hslToHex(h, s * 0.45, l);
    // 对比度不足时向两端调整明度
    for (let i = 0; i < 20 && contrastRatio(muted, bg) < 4.5; i++) {
      l += dark ? 0.02 : -0.02;
      muted = hslToHex(h, s * 0.45, Math.max(0, Math.min(1, l)));
    }
    return muted;
  }

  // ── template.json 元数据：名称、字体、PPT 预设 ──

  private applyTemplateMeta(theme: ThemeStyle, source: string): void {
    const jsonPath = join(dirname(source), "template.json");
    if (!existsSync(jsonPath)) return;

    let meta: TemplateMeta;
    try {
      meta = JSON.parse(readFileSync(jsonPath, "utf-8"));
    } catch {
      return;
    }

    if (meta.slug) theme.name = meta.slug;
    if (meta.tagline) theme.description = meta.tagline;

    const t = theme.typography;
    const st = theme.seedTypography;
    const typo = meta.typography ?? {};

    const cjkSerif = typo.serif_cn || "Noto Serif SC";
    const cjkSans = typo.sans_cn || "Noto Sans SC";

    // 标题字体：display + CJK 回退 + generic family 结尾（契约 SLIDE-03）
    if (typo.display) {
      const isSerif = this.isSerifFont(typo.display, t.headingFontFamily);
      t.headingFontFamily = `"${typo.display}", "${isSerif ? cjkSerif : cjkSans}", ${isSerif ? "serif" : "sans-serif"}`;
      st.fontHeading = t.headingFontFamily;
    }

    // 正文字体
    if (typo.body) {
      const isSerifBody = this.isSerifFont(typo.body, "");
      t.bodyFontFamily = `"${typo.body}", "${isSerifBody ? cjkSerif : cjkSans}", ${isSerifBody ? "serif" : "sans-serif"}`;
      st.fontBody = t.bodyFontFamily;
    }

    // 代码字体
    if (typo.mono) {
      t.codeFontFamily = `"${typo.mono}", "Noto Sans Mono CJK SC", monospace`;
      st.fontCode = t.codeFontFamily;
    }

    // PPT 预设自动判定：display 字体的气质决定幻灯片标题的声音
    theme.slidePreset = this.detectSlidePreset(typo.display, t.headingFontFamily);

    // 幻灯片版式设计提示：气质标签 + 明暗 + 密度/正式度 + 模板自身字号阶梯比例
    theme.slideDesign = {
      density: meta.density,
      formality: meta.formality,
      scheme: meta.scheme,
      mood: Array.isArray(meta.mood) ? meta.mood.map(String) : undefined,
      ...this.readTypeScale(source),
    };
  }

  private isSerifFont(name: string, extractedStack: string): boolean {
    if (MONO_FONT_HINTS.test(name)) return false;
    if (SERIF_FONT_HINTS.test(name)) return true;
    // 提取到的标题字体栈以 serif generic 结尾（且非 sans）也算衬线
    if (extractedStack && /serif\s*$/i.test(extractedStack.trim()) && !/sans-serif\s*$/i.test(extractedStack.trim())) {
      return true;
    }
    return false;
  }

  private detectSlidePreset(display: string | undefined, headingStack: string): "serif" | "sans" | "mono" {
    const name = display || "";
    if (MONO_FONT_HINTS.test(name)) return "mono";
    if (this.isSerifFont(name, headingStack)) return "serif";
    return "sans";
  }

  // ── :root 颜色 token：语义映射 + 明度/饱和度启发式 ──

  private applyRootTokenColors(theme: ThemeStyle, source: string): void {
    const rootVars = this.readRootVars(source);
    if (rootVars.size === 0) return;

    const p = theme.palette;
    const schemeRaw = this.readScheme(source) || this.inferScheme(p.bgColor);
    // mixed（深浅混排）模板的内容面板是浅色纸面，文档主题按亮色处理
    const scheme = schemeRaw === "dark" ? "dark" : "light";

    // 明度/饱和度启发式：所有 :root hex 值按明度排序出背景/前景，
    // 剩余里挑与背景/前景都拉开距离的最饱和色为强调色
    const hexes = Array.from(rootVars.values()).filter(isHexColor);
    const sortedByLum = [...hexes].sort((a, b) => luminance(a) - luminance(b));
    const heuristicBg = scheme === "dark" ? sortedByLum[0] : sortedByLum[sortedByLum.length - 1];
    const heuristicFg = scheme === "dark" ? sortedByLum[sortedByLum.length - 1] : sortedByLum[0];
    const heuristicAccent = hexes
      .filter((c) => colorDistance(c, heuristicBg) > 80 && colorDistance(c, heuristicFg) > 80)
      .sort((a, b) => saturation(b) - saturation(a))[0];

    // 语义 token 优先（含 --c-* 前缀等子串匹配），启发式兜底；覆盖范式默认值
    p.bgColor = this.pickVar(rootVars, "bg", SEMANTIC_BG) ?? heuristicBg ?? p.bgColor;
    p.textColor = this.pickVar(rootVars, "fg|text|ink", SEMANTIC_FG) ?? heuristicFg ?? p.textColor;
    p.accentColor = this.pickVar(rootVars, "accent|primary|brand", SEMANTIC_ACCENT) ?? heuristicAccent ?? p.accentColor;
    const muted = this.pickVar(rootVars, "muted", SEMANTIC_MUTED);
    const border = this.pickVar(rootVars, "border|line", SEMANTIC_BORDER);
    if (muted) p.textMuted = muted;
    if (border) p.borderColor = border;
  }

  /** 从 <style> 的 :root 规则读取 CSS 自定义属性（小写键名） */
  private readRootVars(source: string): Map<string, string> {
    let $: import("cheerio").CheerioAPI;
    try {
      $ = cheerio.load(readFileSync(source, "utf-8"));
    } catch {
      return new Map();
    }
    const rules = this.parseCssRules(this.extractAllStyles($));
    const merged = new Map<string, string>();
    for (const [selector, props] of rules) {
      const sel = selector.toLowerCase();
      if (sel === ":root" || sel === "html" || sel === "html:root") {
        for (const [k, v] of props) {
          if (k.startsWith("--") && isHexColor(v)) merged.set(k, v.toLowerCase());
        }
      }
    }
    return merged;
  }

  private readScheme(source: string): string | null {
    const jsonPath = join(dirname(source), "template.json");
    if (!existsSync(jsonPath)) return null;
    try {
      const meta: TemplateMeta = JSON.parse(readFileSync(jsonPath, "utf-8"));
      return typeof meta.scheme === "string" ? meta.scheme : null;
    } catch {
      return null;
    }
  }

  private inferScheme(bg: string): "dark" | "light" {
    if (bg && isHexColor(bg)) return luminance(bg) < 0.4 ? "dark" : "light";
    return "light";
  }

  /**
   * 从 :root 的字号 token（--sz-display / --sz-body / --sz-lead 等）推导
   * display/body 与 lead/body 比例，供幻灯片版式阶梯映射。
   */
  private readTypeScale(source: string): { displayRatio?: number; leadRatio?: number } {
    let $: import("cheerio").CheerioAPI;
    try {
      $ = cheerio.load(readFileSync(source, "utf-8"));
    } catch {
      return {};
    }
    const rules = this.parseCssRules(this.extractAllStyles($));
    const sizes = new Map<string, number>();
    for (const [selector, props] of rules) {
      const sel = selector.toLowerCase();
      if (sel !== ":root" && sel !== "html" && sel !== "html:root") continue;
      for (const [k, v] of props) {
        const m = v.trim().match(/^([\d.]+)(vw|vh|rem|em|px)$/i);
        if (k.startsWith("--") && m) sizes.set(k.toLowerCase(), parseFloat(m[1]));
      }
    }
    if (sizes.size === 0) return {};

    const pick = (pattern: RegExp): number | undefined => {
      for (const [k, v] of sizes) if (pattern.test(k)) return v;
      return undefined;
    };
    const display = pick(/display|hero|sz-h1|-h1/);
    const body = pick(/body/);
    const lead = pick(/lead/);
    const out: { displayRatio?: number; leadRatio?: number } = {};
    if (display && body && body > 0) out.displayRatio = Number((display / body).toFixed(2));
    if (lead && body && body > 0) out.leadRatio = Number((lead / body).toFixed(2));
    return out;
  }

  private pickVar(vars: Map<string, string>, pattern: string, exactKeys: string[]): string | undefined {
    // 1) 精确语义名单
    for (const key of exactKeys) {
      const v = vars.get(key);
      if (v && isHexColor(v)) return v.toLowerCase();
    }
    // 2) 子串匹配（覆盖 --c-bg / --c-fg / --ink / --text-primary 等命名变体）
    const regex = new RegExp(pattern);
    for (const [k, v] of vars) {
      if (regex.test(k) && isHexColor(v)) return v.toLowerCase();
    }
    return undefined;
  }
}

// ── 颜色工具 ──

function isHexColor(v: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(v.trim());
}

function ensureHex(v: string, fallback: string): string {
  return isHexColor(v) ? v.trim().toLowerCase() : fallback;
}

/** 线性插值混合两个 hex 颜色，t 为偏向 b 的比例（0-1） */
function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(ensureHex(a, "#000000"));
  const [r2, g2, b2] = hexToRgb(ensureHex(b, "#ffffff"));
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (
    "#" +
    [c(r1, r2), c(g1, g2), c(b1, b2)]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** RGB 欧氏距离（0-441） */
function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** WCAG 对比度 */
function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** HSL → hex */
function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 相对亮度（0-1，WCAG 近似） */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** HSL 饱和度（0-1） */
function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}
