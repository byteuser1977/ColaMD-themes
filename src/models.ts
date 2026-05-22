/** Theme style data models. */

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

export interface ThemeStyle {
  name: string;
  description: string;
  palette: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  syntax: SyntaxHighlighting;
  sourceUrl: string;
  sourceType: string;
}

export function defaultPalette(): ColorPalette {
  return {
    bgColor: "#ffffff",
    textColor: "#000000",
    headingColor: "",
    borderColor: "#cccccc",
    accentColor: "#0000ff",
    codeBg: "#f5f5f5",
    codeColor: "",
    codeBlockBg: "#1e1e1e",
    codeBlockText: "#d4d4d4",
    blockquoteBg: "#f9f9f9",
    blockquoteBorder: "",
    tableHeaderBg: "#f0f0f0",
    selectionBg: "",
    textMuted: "#666666",
  };
}

export function defaultTypography(palette?: ColorPalette): Typography {
  return {
    bodyFontFamily: "Georgia, serif",
    headingFontFamily: "",
    codeFontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    baseFontSize: "16px",
    baseLineHeight: 1.9,
    headingWeight: 700,
  };
}

export function defaultSpacing(): Spacing {
  return {
    contentMaxWidth: "820px",
    contentPadding: "30px 60px 100px",
    paragraphMargin: "0.8em 0",
    headingMarginTop: "1.8em",
    headingMarginBottom: "0.6em",
  };
}

export function defaultSyntax(): SyntaxHighlighting {
  return {
    comment: "",
    punctuation: "",
    keyword: "",
    booleanBuiltinTag: "",
    string: "",
    number: "",
    functionClass: "",
    operator: "",
    variable: "",
    regex: "",
  };
}

export function makeThemeStyle(name: string, sourceType: string, sourceUrl: string): ThemeStyle {
  const palette = defaultPalette();
  const typography = defaultTypography(palette);
  return {
    name,
    description: `Theme extracted from ${sourceType}`,
    palette,
    typography,
    spacing: defaultSpacing(),
    syntax: defaultSyntax(),
    sourceUrl,
    sourceType,
  };
}
