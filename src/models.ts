/** Theme style data models — v3.0 Seed Palette paradigm. */

// ═══════════════════════════════════════════════════════════
// Legacy model (kept for extractor compatibility)
// ═══════════════════════════════════════════════════════════

export interface ColorPalette {
  bgColor: string;
  textColor: string;
  headingColor: string;
  borderColor: string;
  accentColor: string;
  codeBg: string;
  codeColor: string;
  codeBlockBg: string;
  codeBlockText: string;
  blockquoteBg: string;
  blockquoteBorder: string;
  tableHeaderBg: string;
  selectionBg: string;
  textMuted: string;
}

export interface Typography {
  bodyFontFamily: string;
  headingFontFamily: string;
  codeFontFamily: string;
  baseFontSize: string;
  baseLineHeight: number;
  headingWeight: number;
}

export interface Spacing {
  contentMaxWidth: string;
  contentPadding: string;
  paragraphMargin: string;
  headingMarginTop: string;
  headingMarginBottom: string;
}

export interface SyntaxHighlighting {
  comment: string;
  punctuation: string;
  keyword: string;
  booleanBuiltinTag: string;
  string: string;
  number: string;
  functionClass: string;
  operator: string;
  variable: string;
  regex: string;
}

// ═══════════════════════════════════════════════════════════
// v3.0 Seed Palette model
// ═══════════════════════════════════════════════════════════

export interface SeedPalette {
  accent: string;
  accentLight: string;
  accentDark: string;
  surface: string;
  panel: string;
  panelAlt: string;
  ink: string;
  inkMuted: string;
  inkDim: string;
  border: string;
  borderStrong: string;
}

export interface SeedTypography {
  fontBody: string;
  fontHeading: string;
  fontCode: string;
  fontMermaid: string;
  fontSizeRoot: string;      // e.g. "16px"
  fontScaleH1: number;
  fontScaleH2: number;
  fontScaleH3: number;
  fontScaleH4: number;
  fontScaleH5: number;
  fontScaleH6: number;
  fontSizeMermaid: string;
  lineHeightBody: number;
  lineHeightHeading: number;
  lineHeightCode: number;
}

export interface ThemeStyle {
  name: string;
  description: string;
  /** Legacy — populated by extractors, then mapped to seed */
  palette: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  syntax: SyntaxHighlighting;
  /** v3.0 seed palette */
  seed: SeedPalette;
  seedTypography: SeedTypography;
  /** Selected presets */
  colorSystemId: string;
  mermaidPresetId: string;
  /** Metadata */
  sourceUrl: string;
  sourceType: string;
  /** Computed radius and width */
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  contentWidth: string;
}

// ═══════════════════════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════════════════════

export function defaultPalette(): ColorPalette {
  return {
    bgColor: "#ffffff", textColor: "#000000", headingColor: "",
    borderColor: "#cccccc", accentColor: "#0000ff", codeBg: "#f5f5f5",
    codeColor: "", codeBlockBg: "#1e1e1e", codeBlockText: "#d4d4d4",
    blockquoteBg: "#f9f9f9", blockquoteBorder: "",
    tableHeaderBg: "#f0f0f0", selectionBg: "", textMuted: "#666666",
  };
}

export function defaultTypography(): Typography {
  return {
    bodyFontFamily: "Georgia, serif", headingFontFamily: "",
    codeFontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    baseFontSize: "16px", baseLineHeight: 1.9, headingWeight: 700,
  };
}

export function defaultSpacing(): Spacing {
  return {
    contentMaxWidth: "820px", contentPadding: "30px 60px 100px",
    paragraphMargin: "0.8em 0", headingMarginTop: "1.8em",
    headingMarginBottom: "0.6em",
  };
}

export function defaultSyntax(): SyntaxHighlighting {
  return { comment: "", punctuation: "", keyword: "", booleanBuiltinTag: "",
    string: "", number: "", functionClass: "", operator: "", variable: "", regex: "" };
}

export function defaultSeedPalette(): SeedPalette {
  return {
    accent: "#6366f1", accentLight: "#eef2ff", accentDark: "#4f46e5",
    surface: "#ffffff", panel: "#f8f9fb", panelAlt: "#f1f3f5",
    ink: "#1a1d26", inkMuted: "#6b7280", inkDim: "#9ca3af",
    border: "#e5e7eb", borderStrong: "#d1d5db",
  };
}

export function defaultSeedTypography(): SeedTypography {
  return {
    fontBody: `"Inter", "SF Pro Text", -apple-system, "Noto Serif SC", "Source Han Serif SC", Georgia, serif`,
    fontHeading: `"Inter", "SF Pro Display", -apple-system, "Noto Sans SC", "PingFang SC", sans-serif`,
    fontCode: `"JetBrains Mono", "SF Mono", "Fira Code", Menlo, Consolas, monospace`,
    fontMermaid: `var(--font-heading)`,
    fontSizeRoot: "16px",
    fontScaleH1: 2.0, fontScaleH2: 1.5, fontScaleH3: 1.25,
    fontScaleH4: 1.1, fontScaleH5: 1.0, fontScaleH6: 0.95,
    fontSizeMermaid: "13px",
    lineHeightBody: 1.75, lineHeightHeading: 1.35, lineHeightCode: 1.6,
  };
}

// ═══════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════

export function makeThemeStyle(name: string, sourceType: string, sourceUrl: string): ThemeStyle {
  return {
    name,
    description: `Theme extracted from ${sourceType}`,
    palette: defaultPalette(),
    typography: defaultTypography(),
    spacing: defaultSpacing(),
    syntax: defaultSyntax(),
    seed: defaultSeedPalette(),
    seedTypography: defaultSeedTypography(),
    colorSystemId: "",
    mermaidPresetId: "",
    sourceUrl,
    sourceType,
    radiusSm: "3px",
    radiusMd: "6px",
    radiusLg: "10px",
    contentWidth: "820px",
  };
}

/** Map legacy ColorPalette to SeedPalette. */
export function paletteToSeed(palette: ColorPalette): SeedPalette {
  return {
    accent: palette.accentColor,
    accentLight: palette.selectionBg || palette.accentColor,
    accentDark: palette.accentColor,
    surface: palette.bgColor,
    panel: palette.codeBg,
    panelAlt: palette.codeBlockBg,
    ink: palette.textColor,
    inkMuted: palette.textMuted,
    inkDim: palette.textMuted,
    border: palette.borderColor,
    borderStrong: palette.borderColor,
  };
}
