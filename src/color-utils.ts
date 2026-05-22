/** Color manipulation utilities. */

export function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

export function lighten(hex: string, factor: number = 0.3): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  );
}

export function darken(hex: string, factor: number = 0.15): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

export function toRgba(hex: string, alpha: number = 0.18): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function rgbToHsl(
  r: number, g: number, b: number
): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s: number;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h, s, l];
}

export function deriveSyntaxColors(
  baseHex: string
): Record<string, string> {
  const [r, g, b] = hexToRgb(baseHex);
  const [, , l] = rgbToHsl(r, g, b);
  const isDark = l < 0.5;

  if (isDark) {
    return {
      comment: lighten(baseHex, 0.4),
      punctuation: lighten(baseHex, 0.2),
      keyword: "#569cd6",
      booleanBuiltinTag: "#569cd6",
      string: "#ce9178",
      number: "#b5cea8",
      functionClass: "#dcdcaa",
      operator: lighten(baseHex, 0.2),
      variable: lighten(baseHex, 0.2),
      regex: "#d16969",
    };
  } else {
    return {
      comment: darken(baseHex, 0.4),
      punctuation: baseHex,
      keyword: "#0000ff",
      booleanBuiltinTag: "#0000ff",
      string: "#a31515",
      number: "#098658",
      functionClass: "#795e26",
      operator: baseHex,
      variable: baseHex,
      regex: "#811f3f",
    };
  }
}

export function normalizeThemeStyle(style: import("./models.js").ThemeStyle): void {
  const p = style.palette;
  const t = style.typography;
  const s = style.syntax;

  if (!p.headingColor) p.headingColor = p.textColor;
  if (!p.codeColor) p.codeColor = p.textColor;
  if (!p.blockquoteBorder) p.blockquoteBorder = p.accentColor;
  if (!p.selectionBg) p.selectionBg = toRgba(p.accentColor);
  if (!t.headingFontFamily) t.headingFontFamily = t.bodyFontFamily;

  if (!s.comment) {
    const derived = deriveSyntaxColors(p.codeBlockText);
    for (const [key, value] of Object.entries(derived)) {
      const k = key as keyof typeof s;
      if (!s[k]) (s as unknown as Record<string, string>)[key] = value;
    }
  }
}
