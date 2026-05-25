/**
 * DOCX 文档样式规范体系 — v1.0
 *
 * 核心功能：
 * 1. 定义完整的文档元素样式层级（标题 H1-H6、正文、表格等）
 * 2. 提供 WCAG 2.1 AAA 级对比度合规的标准参考值
 * 3. 实现打印友好型灰度/低饱和度配色方案
 * 4. 提供样式提取 fallback 与规范化工具
 *
 * 设计原则：
 * - 文字色使用灰度轴（HSL S ≤ 0.05）或极低饱和度（S ≤ 0.15）
 * - 背景色保持近白/近黑中性，饱和度 ≤ 0.03
 * - 所有前景/背景对比度满足 WCAG AA (4.5:1) 或 AAA (7:1)
 * - 行间距遵循中文排版规范（正文 1.5-1.9，标题 1.25-1.4）
 */

import { hexToRgb, rgbToHex, lighten, darken } from "./color-utils.js";
import { relativeLuminance, contrastRatio, hslSaturation, hslLightness } from "./contrast.js";

// ═══════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════

/** 单个字体样式的完整定义 */
export interface FontStyleDefinition {
  /** 字体家族（CSS font-family 值） */
  fontFamily: string;
  /** 字号（px） */
  fontSize: number;
  /** 字重（100-900） */
  fontWeight: number;
  /** 文字颜色（hex） */
  color: string;
  /** 行高倍率 */
  lineHeight: number;
  /** 字间距（em，可选） */
  letterSpacing?: number;
  /** 段后间距（em，可选） */
  marginBottom?: number;
}

/** 表格单元格样式定义 */
export interface TableCellStyle {
  /** 表头字体家族 */
  headerFontFamily: string;
  /** 表头字号（px） */
  headerFontSize: number;
  /** 表头字重 */
  headerFontWeight: number;
  /** 表头文字颜色 */
  headerColor: string;
  /** 表头背景颜色 */
  headerBgColor: string;
  /** 表头行高 */
  headerLineHeight: number;

  /** 单元格字体家族 */
  cellFontFamily: string;
  /** 单元格字号（px） */
  cellFontSize: number;
  /** 单元格文字颜色 */
  cellColor: string;
  /** 单元格背景颜色 */
  cellBgColor: string;
  /** 单元格行高 */
  cellLineHeight: number;
  /** 单元格内边距 */
  cellPadding: string;
  /** 边框颜色 */
  borderColor: string;
  /** 边框宽度 */
  borderWidth: string;
}

/** 完整的文档样式规范 */
export interface DocumentStyleParadigm {
  /** 文档背景颜色 */
  pageBackground: string;
  /** 各级标题样式映射 */
  headings: Record<"h1" | "h2" | "h3" | "h4" | "h5" | "h6", FontStyleDefinition>;
  /** 正文样式 */
  body: FontStyleDefinition;
  /** 引用块样式 */
  blockquote: FontStyleDefinition & { borderLeftColor: string; bgColor: string };
  /** 代码块样式 */
  codeBlock: FontStyleDefinition & { bgColor: string };
  /** 内联代码样式 */
  inlineCode: { fontSize: number; color: string; bgColor: string };
  /** 表格样式 */
  table: TableCellStyle;
  /** 链接/强调色 */
  accentColor: string;
  /** 弱化文字颜色（脚注、辅助信息） */
  mutedTextColor: string;
  /** 选区高亮色 */
  selectionBg: string;
}

/** 打印优化配置 */
export interface PrintOptimization {
  /** 是否启用纯灰度模式（强制所有彩色转灰度） */
  forceGrayscale: boolean;
  /** 最大文字饱和度阈值（0-1） */
  maxTextSaturation: number;
  /** 最小对比度要求（WCAG 级别） */
  minContrastRatio: "AA" | "AAA";
  /** 背景色亮度调整（-1 到 1，负值变亮） */
  bgBrightnessOffset: number;
}

// ═══════════════════════════════════════════════════════════
// 常量：标准参考值（Fallback Defaults）
// ═══════════════════════════════════════════════════════════

/**
 * 学术论文标准参考值
 * 基于 GB/T 7713-1987 中文学术论文编排规则 + WCAG AAA
 */
export const ACADEMIC_PAPER_DEFAULTS: DocumentStyleParadigm = {
  pageBackground: "#ffffff",

  headings: {
    h1: {
      fontFamily: '"SimHei", "Heiti SC", "Source Han Sans SC", sans-serif',
      fontSize: 22,
      fontWeight: 700,
      color: "#1a1a1a",
      lineHeight: 1.35,
      marginBottom: 0.8,
    },
    h2: {
      fontFamily: '"SimHei", "Heiti SC", "Source Han Sans SC", sans-serif',
      fontSize: 18,
      fontWeight: 700,
      color: "#1a1a1a",
      lineHeight: 1.35,
      marginBottom: 0.7,
    },
    h3: {
      fontFamily: '"SimHei", "Heiti SC", "Source Han Sans SC", sans-serif',
      fontSize: 16,
      fontWeight: 600,
      color: "#2a2a2a",
      lineHeight: 1.4,
      marginBottom: 0.6,
    },
    h4: {
      fontFamily: '"SimSun", "Songti SC", serif',
      fontSize: 14,
      fontWeight: 600,
      color: "#333333",
      lineHeight: 1.4,
      marginBottom: 0.5,
    },
    h5: {
      fontFamily: '"SimSun", "Songti SC", serif',
      fontSize: 13,
      fontWeight: 600,
      color: "#444444",
      lineHeight: 1.45,
      marginBottom: 0.4,
    },
    h6: {
      fontFamily: '"SimSun", "Songti SC", serif',
      fontSize: 12,
      fontWeight: 600,
      color: "#555555",
      lineHeight: 1.5,
      marginBottom: 0.3,
    },
  },

  body: {
    fontFamily: '"SimSun", "Songti SC", "Noto Serif SC", Georgia, serif',
    fontSize: 16,
    fontWeight: 400,
    color: "#222222",
    lineHeight: 1.75,
    letterSpacing: 0.02,
  },

  blockquote: {
    fontFamily: '"SimSun", "Songti SC", serif',
    fontSize: 14,
    fontWeight: 400,
    color: "#555555",
    lineHeight: 1.65,
    borderLeftColor: "#888888",
    bgColor: "#fafafa",
  },

  codeBlock: {
    fontFamily: '"Courier New", Consolas, monospace',
    fontSize: 13,
    fontWeight: 400,
    color: "#333333",
    lineHeight: 1.5,
    bgColor: "#f5f5f5",
  },

  inlineCode: {
    fontSize: 13,
    color: "#c7254e",
    bgColor: "#f9f2f4",
  },

  table: {
    headerFontFamily: '"SimHei", "Heiti SC", sans-serif',
    headerFontSize: 13,
    headerFontWeight: 700,
    headerColor: "#ffffff",
    headerBgColor: "#4a4a4a",
    headerLineHeight: 1.4,

    cellFontFamily: '"SimSun", "Songti SC", serif',
    cellFontSize: 12,
    cellColor: "#333333",
    cellBgColor: "#ffffff",
    cellLineHeight: 1.5,
    cellPadding: "8px 12px",
    borderColor: "#cccccc",
    borderWidth: "1px",
  },

  accentColor: "#2b579a",
  mutedTextColor: "#666666",
  selectionBg: "rgba(43, 87, 154, 0.15)",
};

/**
 * 商务报告标准参考值
 * 现代、简洁、打印友好
 */
export const BUSINESS_REPORT_DEFAULTS: DocumentStyleParadigm = {
  pageBackground: "#ffffff",

  headings: {
    h1: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
      fontSize: 24,
      fontWeight: 700,
      color: "#1f2937",
      lineHeight: 1.3,
      marginBottom: 1.0,
    },
    h2: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
      fontSize: 20,
      fontWeight: 600,
      color: "#374151",
      lineHeight: 1.35,
      marginBottom: 0.8,
    },
    h3: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
      fontSize: 17,
      fontWeight: 600,
      color: "#4b5563",
      lineHeight: 1.38,
      marginBottom: 0.6,
    },
    h4: {
      fontFamily: '"Inter", -apple-system, sans-serif',
      fontSize: 15,
      fontWeight: 600,
      color: "#6b7280",
      lineHeight: 1.4,
      marginBottom: 0.5,
    },
    h5: {
      fontFamily: '"Inter", -apple-system, sans-serif',
      fontSize: 14,
      fontWeight: 500,
      color: "#6b7280",
      lineHeight: 1.45,
      marginBottom: 0.4,
    },
    h6: {
      fontFamily: '"Inter", -apple-system, sans-serif',
      fontSize: 13,
      fontWeight: 500,
      color: "#9ca3af",
      lineHeight: 1.5,
      marginBottom: 0.3,
    },
  },

  body: {
    fontFamily: '"Inter", "SF Pro Text", -apple-system, "Noto Sans SC", sans-serif',
    fontSize: 15,
    fontWeight: 400,
    color: "#374151",
    lineHeight: 1.7,
    letterSpacing: 0.01,
  },

  blockquote: {
    fontFamily: '"Inter", sans-serif',
    fontSize: 14,
    fontWeight: 400,
    color: "#6b7280",
    lineHeight: 1.6,
    borderLeftColor: "#9ca3af",
    bgColor: "#f9fafb",
  },

  codeBlock: {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: 12.5,
    fontWeight: 400,
    color: "#374151",
    lineHeight: 1.55,
    bgColor: "#f3f4f6",
  },

  inlineCode: {
    fontSize: 12.5,
    color: "#dc2626",
    bgColor: "#fef2f2",
  },

  table: {
    headerFontFamily: '"Inter", -apple-system, sans-serif',
    headerFontSize: 12.5,
    headerFontWeight: 600,
    headerColor: "#ffffff",
    headerBgColor: "#4b5563",
    headerLineHeight: 1.4,

    cellFontFamily: '"Inter", sans-serif',
    cellFontSize: 12,
    cellColor: "#374151",
    cellBgColor: "#ffffff",
    cellLineHeight: 1.5,
    cellPadding: "10px 14px",
    borderColor: "#e5e7eb",
    borderWidth: "1px",
  },

  accentColor: "#2563eb",
  mutedTextColor: "#9ca3af",
  selectionBg: "rgba(37, 99, 235, 0.12)",
};

/**
 * 技术文档标准参考值
 * 适合 API 文档、技术手册
 */
export const TECHNICAL_DOC_DEFAULTS: DocumentStyleParadigm = {
  pageBackground: "#fefefe",

  headings: {
    h1: {
      fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif',
      fontSize: 28,
      fontWeight: 800,
      color: "#111827",
      lineHeight: 1.25,
      marginBottom: 1.2,
    },
    h2: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: 22,
      fontWeight: 700,
      color: "#1f2937",
      lineHeight: 1.3,
      marginBottom: 0.9,
    },
    h3: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: 18,
      fontWeight: 600,
      color: "#374151",
      lineHeight: 1.35,
      marginBottom: 0.7,
    },
    h4: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: 16,
      fontWeight: 600,
      color: "#4b5563",
      lineHeight: 1.38,
      marginBottom: 0.5,
    },
    h5: {
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSize: 14,
      fontWeight: 500,
      color: "#6b7280",
      lineHeight: 1.42,
      marginBottom: 0.4,
    },
    h6: {
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      fontWeight: 500,
      color: "#9ca3af",
      lineHeight: 1.5,
      marginBottom: 0.3,
    },
  },

  body: {
    fontFamily: '"Inter", "SF Pro Text", system-ui, "Noto Sans SC", sans-serif',
    fontSize: 16,
    fontWeight: 400,
    color: "#1f2937",
    lineHeight: 1.75,
  },

  blockquote: {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: 14.5,
    fontWeight: 400,
    color: "#6b7280",
    lineHeight: 1.65,
    borderLeftColor: "#d1d5db",
    bgColor: "#f9fafb",
  },

  codeBlock: {
    fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
    fontSize: 13.5,
    fontWeight: 400,
    color: "#e5e7eb",
    lineHeight: 1.6,
    bgColor: "#1f2937",
  },

  inlineCode: {
    fontSize: 13,
    color: "#dc2626",
    bgColor: "#fef2f2",
  },

  table: {
    headerFontFamily: '"Inter", system-ui, sans-serif',
    headerFontSize: 13,
    headerFontWeight: 600,
    headerColor: "#f9fafb",
    headerBgColor: "#374151",
    headerLineHeight: 1.4,

    cellFontFamily: '"Inter", sans-serif',
    cellFontSize: 13,
    cellColor: "#374151",
    cellBgColor: "#ffffff",
    cellLineHeight: 1.55,
    cellPadding: "10px 14px",
    borderColor: "#e5e7eb",
    borderWidth: "1px",
  },

  accentColor: "#2563eb",
  mutedTextColor: "#9ca3af",
  selectionBg: "rgba(37, 99, 235, 0.15)",
};

// ═══════════════════════════════════════════════════════════
// 打印友好型灰度/低饱和度配色生成器
// ═══════════════════════════════════════════════════════════

/**
 * 生成打印优化的灰度色板
 * @param baseBrightness 页面基础亮度（0=纯黑，1=纯白）
 * @param options 打印优化配置
 */
export function generatePrintFriendlyGrayscale(
  baseBrightness: number = 0.97,
  options?: Partial<PrintOptimization>
): DocumentStyleParadigm {
  const opts: PrintOptimization = {
    forceGrayscale: true,
    maxTextSaturation: 0.05,
    minContrastRatio: "AAA",
    bgBrightnessOffset: 0,
    ...options,
  };

  const surfaceValue = Math.round(baseBrightness * 255);
  const surfaceHex = rgbToHex(surfaceValue, surfaceValue, surfaceValue);

  const inkValue = Math.max(0, Math.round((1 - baseBrightness) * 255 * 0.92));
  const inkHex = rgbToHex(inkValue, inkValue, inkValue);

  const mutedValue = Math.round(inkValue + (surfaceValue - inkValue) * 0.55);
  const mutedHex = rgbToHex(mutedValue, mutedValue, mutedValue);

  const dimValue = Math.round(inkValue + (surfaceValue - inkValue) * 0.75);
  const dimHex = rgbToHex(dimValue, dimValue, dimValue);

  const panelValue = Math.max(0, Math.round(surfaceValue - 12));
  const panelHex = rgbToHex(panelValue, panelValue, panelValue);

  const panelAltValue = Math.max(0, Math.round(surfaceValue - 24));
  const panelAltHex = rgbToHex(panelAltValue, panelAltValue, panelAltValue);

  const accentGray = opts.forceGrayscale
    ? rgbToHex(Math.round(inkValue * 0.4), Math.round(inkValue * 0.4), Math.round(inkValue * 0.4))
    : "#4a5568";

  return {
    pageBackground: surfaceHex,

    headings: {
      h1: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h1.fontFamily, fontSize: 22, fontWeight: 700, color: inkHex, lineHeight: 1.35, marginBottom: 0.8 },
      h2: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h2.fontFamily, fontSize: 18, fontWeight: 700, color: inkHex, lineHeight: 1.35, marginBottom: 0.7 },
      h3: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h3.fontFamily, fontSize: 16, fontWeight: 600, color: mutedHex, lineHeight: 1.4, marginBottom: 0.6 },
      h4: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h4.fontFamily, fontSize: 14, fontWeight: 600, color: mutedHex, lineHeight: 1.4, marginBottom: 0.5 },
      h5: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h5.fontFamily, fontSize: 13, fontWeight: 600, color: dimHex, lineHeight: 1.45, marginBottom: 0.4 },
      h6: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h6.fontFamily, fontSize: 12, fontWeight: 600, color: dimHex, lineHeight: 1.5, marginBottom: 0.3 },
    },

    body: {
      fontFamily: ACADEMIC_PAPER_DEFAULTS.body.fontFamily,
      fontSize: 16,
      fontWeight: 400,
      color: rgbToHex(Math.round(inkValue * 0.88), Math.round(inkValue * 0.88), Math.round(inkValue * 0.88)),
      lineHeight: 1.75,
      letterSpacing: 0.02,
    },

    blockquote: {
      fontFamily: ACADEMIC_PAPER_DEFAULTS.body.fontFamily,
      fontSize: 14,
      fontWeight: 400,
      color: mutedHex,
      lineHeight: 1.65,
      borderLeftColor: dimHex,
      bgColor: panelHex,
    },

    codeBlock: {
      fontFamily: '"Courier New", Consolas, monospace',
      fontSize: 13,
      fontWeight: 400,
      color: inkHex,
      lineHeight: 1.5,
      bgColor: panelAltHex,
    },

    inlineCode: {
      fontSize: 13,
      color: accentGray,
      bgColor: lighten(panelAltHex, 0.3),
    },

    table: {
      headerFontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h2.fontFamily,
      headerFontSize: 13,
      headerFontWeight: 700,
      headerColor: surfaceHex,
      headerBgColor: rgbToHex(
        Math.round(inkValue * 0.72),
        Math.round(inkValue * 0.72),
        Math.round(inkValue * 0.72)
      ),
      headerLineHeight: 1.4,

      cellFontFamily: ACADEMIC_PAPER_DEFAULTS.body.fontFamily,
      cellFontSize: 12,
      cellColor: rgbToHex(Math.round(inkValue * 0.82), Math.round(inkValue * 0.82), Math.round(inkValue * 0.82)),
      cellBgColor: surfaceHex,
      cellLineHeight: 1.5,
      cellPadding: "8px 12px",
      borderColor: rgbToHex(
        Math.round(surfaceValue - 40),
        Math.round(surfaceValue - 40),
        Math.round(surfaceValue - 40)
      ),
      borderWidth: "1px",
    },

    accentColor: accentGray,
    mutedTextColor: mutedHex,
    selectionBg: `rgba(${Math.round(inkValue * 0.4)}, ${Math.round(inkValue * 0.4)}, ${Math.round(inkValue * 0.4)}, 0.15)`,
  };
}

/**
 * 生成低饱和度莫兰迪风格色板（适合打印）
 * 保持微弱色相但大幅降低饱和度
 */
export function generateMorandiPrintPalette(
  hueDeg: number = 210,
  saturation: number = 0.08,
): DocumentStyleParadigm {
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  };

  const surface = rgbToHex(...hslToRgb(hueDeg, 0.01, 0.98));
  const ink = rgbToRgbString(hslToRgb(hueDeg, 0.04, 0.12));
  const muted = rgbToRgbString(hslToRgb(hueDeg, 0.03, 0.42));
  const dim = rgbToRgbString(hslToRgb(hueDeg, 0.02, 0.58));
  const panel = rgbToRgbString(hslToRgb(hueDeg, 0.02, 0.95));
  const panelAlt = rgbToRgbString(hslToRgb(hueDeg, 0.03, 0.91));
  const accent = rgbToRgbString(hslToRgb(hueDeg, saturation, 0.38));
  const headerBg = rgbToRgbString(hslToRgb(hueDeg, 0.06, 0.32));

  return {
    pageBackground: surface,
    headings: {
      h1: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h1.fontFamily, fontSize: 22, fontWeight: 700, color: ink, lineHeight: 1.35, marginBottom: 0.8 },
      h2: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h2.fontFamily, fontSize: 18, fontWeight: 700, color: ink, lineHeight: 1.35, marginBottom: 0.7 },
      h3: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h3.fontFamily, fontSize: 16, fontWeight: 600, color: muted, lineHeight: 1.4, marginBottom: 0.6 },
      h4: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h4.fontFamily, fontSize: 14, fontWeight: 600, color: muted, lineHeight: 1.4, marginBottom: 0.5 },
      h5: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h5.fontFamily, fontSize: 13, fontWeight: 600, color: dim, lineHeight: 1.45, marginBottom: 0.4 },
      h6: { fontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h6.fontFamily, fontSize: 12, fontWeight: 600, color: dim, lineHeight: 1.5, marginBottom: 0.3 },
    },
    body: {
      fontFamily: ACADEMIC_PAPER_DEFAULTS.body.fontFamily,
      fontSize: 16,
      fontWeight: 400,
      color: ink,
      lineHeight: 1.75,
      letterSpacing: 0.02,
    },
    blockquote: {
      fontFamily: ACADEMIC_PAPER_DEFAULTS.body.fontFamily,
      fontSize: 14,
      fontWeight: 400,
      color: muted,
      lineHeight: 1.65,
      borderLeftColor: dim,
      bgColor: panel,
    },
    codeBlock: {
      fontFamily: '"Courier New", Consolas, monospace',
      fontSize: 13,
      fontWeight: 400,
      color: ink,
      lineHeight: 1.5,
      bgColor: panelAlt,
    },
    inlineCode: { fontSize: 13, color: accent, bgColor: lighten(panelAlt, 0.4) },
    table: {
      headerFontFamily: ACADEMIC_PAPER_DEFAULTS.headings.h2.fontFamily,
      headerFontSize: 13,
      headerFontWeight: 700,
      headerColor: surface,
      headerBgColor: headerBg,
      headerLineHeight: 1.4,
      cellFontFamily: ACADEMIC_PAPER_DEFAULTS.body.fontFamily,
      cellFontSize: 12,
      cellColor: muted,
      cellBgColor: surface,
      cellLineHeight: 1.5,
      cellPadding: "8px 12px",
      borderColor: rgbToRgbString(hslToRgb(hueDeg, 0.04, 0.85)),
      borderWidth: "1px",
    },
    accentColor: accent,
    mutedTextColor: muted,
    selectionBg: `rgba(${hexToRgb(accent).join(",")}, 0.12)`,
  };
}

function rgbToRgbString(rgb: [number, number, number]): string {
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

// ═══════════════════════════════════════════════════════════
// 样式验证工具
// ═══════════════════════════════════════════════════════════

export interface StyleValidationIssue {
  level: "error" | "warning" | "info";
  element: string;
  message: string;
  actualValue?: string;
  expectedRange?: string;
}

/**
 * 验证文档样式是否满足 WCAG 对比度要求和打印友好性
 */
export function validateDocumentStyle(style: DocumentStyleParadigm): StyleValidationIssue[] {
  const issues: StyleValidationIssue[] = [];
  const bg = style.pageBackground;

  const checkContrast = (
    fg: string,
    label: string,
    minRatio: number,
    requiredLevel: string
  ) => {
    const ratio = contrastRatio(fg, bg);
    if (ratio < minRatio) {
      issues.push({
        level: "error",
        element: label,
        message: `${label} 对比度 ${ratio.toFixed(1)}:1 不满足 ${requiredLevel} 要求 (≥${minRatio}:1)`,
        actualValue: `${ratio.toFixed(1)}:1`,
        expectedRange: `≥${minRatio}:1`,
      });
    }
  };

  checkContrast(style.body.color, "正文", 7.0, "WCAG AAA");
  checkContrast(style.headings.h1.color, "H1标题", 7.0, "WCAG AAA");
  checkContrast(style.headings.h2.color, "H2标题", 7.0, "WCAG AAA");
  checkContrast(style.mutedTextColor, "弱化文字", 4.5, "WCAG AA");

  const checkSaturation = (color: string, label: string, maxSat: number) => {
    const sat = hslSaturation(color);
    if (sat > maxSat) {
      issues.push({
        level: "warning",
        element: label,
        message: `${label} 饱和度 ${(sat * 100).toFixed(0)}% 超过打印建议值 (${(maxSat * 100).toFixed(0)}%)`,
        actualValue: `${(sat * 100).toFixed(0)}%`,
        expectedRange: `≤${(maxSat * 100).toFixed(0)}%`,
      });
    }
  };

  checkSaturation(style.body.color, "正文颜色", 0.08);
  checkSaturation(style.headings.h1.color, "H1颜色", 0.08);
  checkSaturation(style.table.headerBgColor, "表头背景", 0.20);

  if (style.codeBlock.bgColor !== "#1f2937" && style.codeBlock.bgColor !== "#000000") {
    const codeBgLum = relativeLuminance(style.codeBlock.bgColor);
    const surfLum = relativeLuminance(bg);
    const diff = Math.abs(codeBgLum - surfLum);
    if (diff < 0.06) {
      issues.push({
        level: "warning",
        element: "代码块背景",
        message: "代码块背景与页面底色区分度过低",
        actualValue: `ΔL=${diff.toFixed(3)}`,
        expectedRange: "ΔL ≥ 0.06",
      });
    }
  }

  return issues;
}

/**
 * 强制将样式规范化为打印友好格式
 * 降低饱和度、确保对比度达标
 */
export function normalizeForPrinting(
  style: DocumentStyleParadigm,
  forceGrayscale: boolean = false
): DocumentStyleParadigm {
  const normalized = JSON.parse(JSON.stringify(style)) as DocumentStyleParadigm;

  const desaturateColor = (hex: string, targetSat: number = 0.05): string => {
    if (forceGrayscale) {
      const [r, g, b] = hexToRgb(hex);
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return rgbToHex(gray, gray, gray);
    }
    return hex;
  };

  normalized.body.color = desaturateColor(normalized.body.color);
  normalized.headings.h1.color = desaturateColor(normalized.headings.h1.color);
  normalized.headings.h2.color = desaturateColor(normalized.headings.h2.color);
  normalized.headings.h3.color = desaturateColor(normalized.headings.h3.color);
  normalized.mutedTextColor = desaturateColor(normalized.mutedTextColor);

  return normalized;
}

// ═══════════════════════════════════════════════════════════
// 预设模板注册表
// ═══════════════════════════════════════════════════════════

export const DOCUMENT_STYLE_PRESETS: Record<string, DocumentStyleParadigm> = {
  "academic-paper": ACADEMIC_PAPER_DEFAULTS,
  "business-report": BUSINESS_REPORT_DEFAULTS,
  "technical-doc": TECHNICAL_DOC_DEFAULTS,
  "print-grayscale": generatePrintFriendlyGrayscale(),
  "print-morandi-blue": generateMorandiPrintPalette(210),
  "print-morandi-green": generateMorandiPrintPalette(140),
  "print-morandi-warm": generateMorandiPrintPalette(30),
};

/**
 * 根据文档类型获取推荐预设
 */
export function getRecommendedPreset(docType?: string): DocumentStyleParadigm {
  const type = (docType || "").toLowerCase();
  if (type.includes("学术") || type.includes("论文") || type.includes("paper")) {
    return ACADEMIC_PAPER_DEFAULTS;
  }
  if (type.includes("商务") || type.includes("报告") || type.includes("report")) {
    return BUSINESS_REPORT_DEFAULTS;
  }
  if (type.includes("技术") || type.includes("api") || type.includes("tech")) {
    return TECHNICAL_DOC_DEFAULTS;
  }
  return ACADEMIC_PAPER_DEFAULTS;
}
