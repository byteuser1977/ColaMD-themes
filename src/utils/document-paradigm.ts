/**
 * Shared document paradigm utilities used by all extractors.
 * Extracted from url-extractor, docx-extractor, and pdf-extractor
 * to eliminate code duplication.
 */

import type { ThemeStyle, DocumentStyleParadigm } from "../docx-style-paradigm.js";
import {
  ACADEMIC_PAPER_DEFAULTS,
  validateDocumentStyle,
} from "../docx-style-paradigm.js";

export function themeToParadigm(theme: ThemeStyle): DocumentStyleParadigm {
  const baseFontSize = parseInt(theme.typography.baseFontSize) || 16;

  return {
    pageBackground: theme.palette.bgColor,
    headings: {
      h1: {
        fontFamily: theme.seedTypography.fontHeading,
        fontSize: 16 * theme.seedTypography.fontScaleH1,
        fontWeight: theme.typography.headingWeight,
        color: theme.palette.headingColor,
        lineHeight: theme.seedTypography.lineHeightHeading,
      },
      h2: {
        fontFamily: theme.seedTypography.fontHeading,
        fontSize: 16 * theme.seedTypography.fontScaleH2,
        fontWeight: Math.max(600, theme.typography.headingWeight - 100),
        color: theme.palette.headingColor,
        lineHeight: theme.seedTypography.lineHeightHeading,
      },
      h3: {
        fontFamily: theme.seedTypography.fontHeading,
        fontSize: 16 * theme.seedTypography.fontScaleH3,
        fontWeight: 600,
        color: theme.palette.headingColor,
        lineHeight: theme.seedTypography.lineHeightHeading + 0.05,
      },
      h4: {
        fontFamily: theme.seedTypography.fontHeading,
        fontSize: 16 * theme.seedTypography.fontScaleH4,
        fontWeight: 600,
        color: theme.palette.textMuted,
        lineHeight: theme.seedTypography.lineHeightHeading + 0.05,
      },
      h5: {
        fontFamily: theme.seedTypography.fontHeading,
        fontSize: 16 * theme.seedTypography.fontScaleH5,
        fontWeight: 500,
        color: theme.palette.textMuted,
        lineHeight: theme.seedTypography.lineHeightBody - 0.25,
      },
      h6: {
        fontFamily: theme.seedTypography.fontHeading,
        fontSize: 16 * theme.seedTypography.fontScaleH6,
        fontWeight: 500,
        color: theme.palette.textMuted,
        lineHeight: theme.seedTypography.lineHeightBody - 0.2,
      },
    },
    body: {
      fontFamily: theme.seedTypography.fontBody,
      fontSize: baseFontSize,
      fontWeight: 400,
      color: theme.palette.textColor,
      lineHeight: theme.typography.baseLineHeight,
    },
    blockquote: {
      fontFamily: theme.seedTypography.fontBody,
      fontSize: Math.max(13, baseFontSize - 2),
      fontWeight: 400,
      color: theme.palette.textMuted,
      lineHeight: theme.typography.baseLineHeight - 0.15,
      borderLeftColor: theme.palette.blockquoteBorder,
      bgColor: theme.palette.blockquoteBg,
    },
    codeBlock: {
      fontFamily: theme.typography.codeFontFamily,
      fontSize: Math.max(12, baseFontSize - 3),
      fontWeight: 400,
      color: theme.palette.codeBlockText || theme.palette.textColor,
      lineHeight: theme.seedTypography.lineHeightCode,
      bgColor: theme.palette.codeBlockBg,
    },
    inlineCode: {
      fontSize: Math.max(12, baseFontSize - 3),
      color: theme.palette.accentColor,
      bgColor: theme.palette.codeBg,
    },
    table: {
      headerFontFamily: theme.seedTypography.fontHeading,
      headerFontSize: Math.max(12, baseFontSize - 3),
      headerFontWeight: 700,
      headerColor: "#ffffff",
      headerBgColor: theme.palette.tableHeaderBg,
      headerLineHeight: 1.4,
      cellFontFamily: theme.seedTypography.fontBody,
      cellFontSize: Math.max(11, baseFontSize - 4),
      cellColor: theme.palette.textColor,
      cellBgColor: theme.palette.bgColor,
      cellLineHeight: 1.5,
      cellPadding: "8px 12px",
      borderColor: theme.palette.borderColor,
      borderWidth: "1px",
    },
    accentColor: theme.palette.accentColor,
    mutedTextColor: theme.palette.textMuted,
    selectionBg: theme.palette.selectionBg,
  };
}

export function logExtractorWarnings(extractorName: string, issues: { element: string; message: string }[]): void {
  for (const issue of issues) {
    console.warn(`[${extractorName}] ${issue.element}: ${issue.message}`);
  }
}