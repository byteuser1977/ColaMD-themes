/**
 * PDF 文档样式提取器 — v2.0
 *
 * 增强功能：
 * 1. 基于文本结构启发式分析提取各级标题样式
 * 2. 检测正文字体、字号、行间距特征
 * 3. 识别表格、代码块等特殊元素
 * 4. 集成 DocxStyleParadigm 标准参考值填充缺失字段
 * 5. 自动验证 WCAG 对比度合规性
 *
 * 技术说明：
 * pdf-parse 默认不提供字体元数据，因此采用多层启发式策略：
 * - 层级1：文本结构分析（短行/大写/编号 = 标题候选）
 * - 层级2：格式特征检测（等宽文本 = 代码块）
 * - 层级3：DocxStyleParadigm 标准参考值 fallback
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { Extractor } from "./base.js";
import {
  makeThemeStyle,
  type ThemeStyle,
  type ColorPalette,
} from "../models.js";
import { normalizeThemeStyle } from "../color-utils.js";
import {
  ACADEMIC_PAPER_DEFAULTS,
  BUSINESS_REPORT_DEFAULTS,
  TECHNICAL_DOC_DEFAULTS,
  getRecommendedPreset,
  validateDocumentStyle,
  type DocumentStyleParadigm,
} from "../docx-style-paradigm.js";

/** PDF 解析结果数据类型 */
type PDFData = {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

/** 从文本行中推断的字体信息 */
interface InferredFontInfo {
  fontName: string;
  fontSize: number;
  isBold: boolean;
  isHeading: boolean;
  headingLevel: number | null;
}

/** 文本行分析结果 */
interface LineAnalysis {
  text: string;
  length: number;
  isAllUppercase: boolean;
  isShortLine: boolean;
  hasNumbering: boolean;
  hasBullet: boolean;
  looksLikeHeading: boolean;
  looksLikeCode: boolean;
  indentLevel: number;
}

export class PdfExtractor implements Extractor {
  canHandle(source: string): boolean {
    return /\.pdf$/i.test(source);
  }

  async extract(source: string): Promise<ThemeStyle> {
    const name = basename(source).replace(/\.pdf$/i, "");
    const theme = makeThemeStyle(name, "pdf", source);

    try {
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = readFileSync(source);
      const data: PDFData = await pdfParse(buffer);

      if (data.text) {
        this.analyzeTextStructure(theme, data.text);
      }

      if (data.metadata) {
        this.populateFromMetadata(theme, data.metadata);
      }

      if (data.info) {
        this.detectDocumentType(theme, data.text, data.numpages);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
        throw new Error("pdf-parse 未安装，请运行: npm install pdf-parse");
      }
      throw err;
    }

    this.applyParadigmDefaults(theme);
    normalizeThemeStyle(theme);
    return theme;
  }

  /**
   * 分析 PDF 文本结构，推断文档元素样式
   */
  private analyzeTextStructure(theme: ThemeStyle, text: string): void {
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const analyzedLines = lines.map((line) => this.analyzeLine(line));

    this.detectHeadings(theme, analyzedLines);
    this.detectBodyText(theme, analyzedLines);
    this.detectCodeBlocks(theme, analyzedLines);
    this.detectTables(theme, analyzedLines);
    this.inferColorPalette(theme, analyzedLines);
  }

  /**
   * 单行文本特征分析
   */
  private analyzeLine(line: string): LineAnalysis {
    const trimmed = line.trim();
    return {
      text: trimmed,
      length: trimmed.length,
      isAllUppercase:
        trimmed.length > 3 &&
        trimmed.length < 80 &&
        /^[A-Z0-9\s\-:.,!?()]+$/.test(trimmed) &&
        /[A-Z]/.test(trimmed) &&
        trimmed.split("").filter((c) => /[a-z]/.test(c)).length === 0,
      isShortLine: trimmed.length < 60,
      hasNumbering: /^\s*(\d+[\.\)]\s*|[一二三四五六七八九十]+[\.\、]\s*|[IVX]+\.\s*)/.test(
        trimmed
      ),
      hasBullet: /^\s*[\-\•\*\·\◦\‣]\s*/.test(trimmed),
      looksLikeHeading: false,
      looksLikeCode: false,
      indentLevel: line.search(/\S/),
    };
  }

  /**
   * 基于启发式规则检测标题层级
   */
  private detectHeadings(theme: ThemeStyle, lines: LineAnalysis[]): void {
    const headingCandidates: { level: number; confidence: number; line: LineAnalysis }[] = [];

    for (const line of lines) {
      let confidence = 0;

      if (line.isAllUppercase && line.isShortLine) {
        confidence += 4;
      }
      if (line.hasNumbering && line.isShortLine) {
        confidence += 3;
      }
      if (line.indentLevel === 0 && line.isShortLine && line.length > 5) {
        confidence += 2;
      }
      if (/^(摘要|ABSTRACT|目录|TABLE OF CONTENTS|引言|INTRODUCTION|结论|CONCLUSION|参考文献|REFERENCES)$/i.test(line.text)) {
        confidence += 5;
      }
      if (/^第[一二三四五六七八九十]+[章节部分]|^Chapter\s+\d+/i.test(line.text)) {
        confidence += 4;
      }
      if (line.length < 30 && line.length > 3 && /^[^\s]{2,}$/.test(line.text)) {
        confidence += 1;
      }

      if (confidence >= 4) {
        line.looksLikeHeading = true;
        let level = 2;
        if (confidence >= 6 || /^(摘要|ABSTRACT|标题|TITLE)$/i.test(line.text)) {
          level = 1;
        } else if (confidence >= 5 || line.hasNumbering) {
          level = 2;
        } else if (line.indentLevel > 0) {
          level = Math.min(4, 2 + Math.floor(line.indentLevel / 2));
        }
        headingCandidates.push({ level, confidence, line });
      }
    }

    if (headingCandidates.length > 0) {
      theme.palette.headingColor = theme.palette.headingColor || ACADEMIC_PAPER_DEFAULTS.headings.h1.color;
      theme.typography.headingWeight = 700;

      const h1Count = headingCandidates.filter((c) => c.level === 1).length;
      const h2Count = headingCandidates.filter((c) => c.level === 2).length;

      if (h1Count > 0) {
        theme.seedTypography.fontScaleH1 = ACADEMIC_PAPER_DEFAULTS.headings.h1.fontSize / 16;
      }
      if (h2Count > 0) {
        theme.seedTypography.fontScaleH2 = ACADEMIC_PAPER_DEFAULTS.headings.h2.fontSize / 16;
      }
      if (headingCandidates.some((c) => c.level >= 3)) {
        theme.seedTypography.fontScaleH3 = ACADEMIC_PAPER_DEFAULTS.headings.h3.fontSize / 16;
      }
    }
  }

  /**
   * 推断正文样式特征
   */
  private detectBodyText(theme: ThemeStyle, lines: LineAnalysis[]): void {
    const bodyLines = lines.filter(
      (l) => !l.looksLikeHeading && !l.looksLikeCode && l.length > 20
    );

    if (bodyLines.length === 0) return;

    const avgLength =
      bodyLines.reduce((sum, l) => sum + l.length, 0) / bodyLines.length;
    const avgIndent =
      bodyLines.reduce((sum, l) => sum + l.indentLevel, 0) / bodyLines.length;

    if (avgLength > 60) {
      theme.typography.baseFontSize = "16px";
      theme.typography.baseLineHeight = 1.75;
    } else if (avgLength > 40) {
      theme.typography.baseFontSize = "15px";
      theme.typography.baseLineHeight = 1.7;
    } else {
      theme.typography.baseFontSize = "14px";
      theme.typography.baseLineHeight = 1.65;
    }

    if (avgIndent >= 2) {
      theme.typography.bodyFontFamily = ACADEMIC_PAPER_DEFAULTS.body.fontFamily;
    }

    theme.seedTypography.lineHeightBody = theme.typography.baseLineHeight;
  }

  /**
   * 检测代码块区域（等宽文本特征）
   */
  private detectCodeBlocks(theme: ThemeStyle, lines: LineAnalysis[]): void {
    const codeIndicators = [
      (l: LineAnalysis) =>
        l.text.includes("function ") ||
        l.text.includes("const ") ||
        l.text.includes("let ") ||
        l.text.includes("var "),
      (l: LineAnalysis) =>
        l.text.includes("{") && l.text.includes("}"),
      (l: LineAnalysis) =>
        /^(\s*(\/\/|#|\/\*|\*\/|\s*import\s+\s*export\s+))/.test(l.text),
      (l: LineAnalysis) =>
        l.text.match(/[;<>=\[\](){}]/g)?.length &&
        l.text.match(/[;<>=\[\](){}]/g)!?.length > 3,
    ];

    for (const line of lines) {
      const isCode = codeIndicators.some((check) => check(line));
      if (isCode) {
        line.looksLikeCode = true;
      }
    }

    const codeLineCount = lines.filter((l) => l.looksLikeCode).length;
    if (codeLineCount > 3) {
      theme.palette.codeBlockBg = "#f5f5f5";
      theme.palette.codeBlockText = "#333333";
      theme.palette.codeBg = "#f9f9f9";
    }
  }

  /**
   * 检测表格结构（多列对齐文本）
   */
  private detectTables(theme: ThemeStyle, lines: LineAnalysis[]): void {
    const tablePatterns = [
      /^\|.+\|.*\|$/,
      /^\s*\|?\s*-{2,}\s*\|/,
      /^\s+(\S+)\s{2,}(\S+)\s{2,}(\S+)/,
    ];

    let tableLineCount = 0;
    for (const line of lines) {
      if (tablePatterns.some((p) => p.test(line.text))) {
        tableLineCount++;
      }
    }

    if (tableLineCount >= 3) {
      theme.palette.tableHeaderBg = ACADEMIC_PAPER_DEFAULTS.table.headerBgColor;
      theme.palette.borderColor = ACADEMIC_PAPER_DEFAULTS.table.borderColor;
    }
  }

  /**
   * 基于文档特征推断配色方案
   */
  private inferColorPalette(theme: ThemeStyle, lines: LineAnalysis[]): void {
    const p = theme.palette;

    const hasChinese = lines.some((l) => /[\u4e00-\u9fa5]/.test(l.text));
    const longEnglishBlocks = lines.filter(
      (l) => l.length > 100 && /^[a-zA-Z0-9\s\.,;\:'"()\[\]{}]+$/.test(l.text)
    ).length;

    if (hasChinese) {
      p.textColor = ACADEMIC_PAPER_DEFAULTS.body.color;
      p.bgColor = ACADEMIC_PAPER_DEFAULTS.pageBackground;
      theme.typography.bodyFontFamily = ACADEMIC_PAPER_DEFAULTS.body.fontFamily;
      theme.typography.headingFontFamily = ACADEMIC_PAPER_DEFAULTS.headings.h1.fontFamily;
    } else if (longEnglishBlocks > 5) {
      p.textColor = BUSINESS_REPORT_DEFAULTS.body.color;
      p.bgColor = BUSINESS_REPORT_DEFAULTS.pageBackground;
      theme.typography.bodyFontFamily = BUSINESS_REPORT_DEFAULTS.body.fontFamily;
      theme.typography.headingFontFamily = BUSINESS_REPORT_DEFAULTS.headings.h1.fontFamily;
    }

    p.accentColor = hasChinese ? "#2b579a" : "#2563eb";
    p.textMuted = hasChinese ? "#666666" : "#9ca3af";
  }

  /**
   * 提取 PDF 元数据信息
   */
  private populateFromMetadata(
    theme: ThemeStyle,
    metadata: Record<string, unknown>
  ): void {
    if (metadata.Title && typeof metadata.Title === "string") {
      theme.description = `主题提取自: ${metadata.Title}`;
    }
    if (metadata.Author && typeof metadata.Author === "string") {
      theme.description = `${theme.description || ""} (作者: ${metadata.Author})`;
    }
  }

  /**
   * 基于内容特征判断文档类型并应用对应预设
   */
  private detectDocumentType(
    theme: ThemeStyle,
    _text: string,
    pageCount: number
  ): void {
    if (pageCount <= 2) {
      theme.description = `${theme.description} [单页文档]`;
    } else if (pageCount > 20) {
      theme.description = `${theme.description} [长篇文档 ${pageCount}页]`;
    }
  }

  /**
   * 应用 DocxStyleParadigm 标准参考值填充所有缺失字段
   */
  private applyParadigmDefaults(theme: ThemeStyle): void {
    const preset = getRecommendedPreset();
    const p = theme.palette;
    const t = theme.typography;
    const st = theme.seedTypography;

    if (!p.textColor || p.textColor === "#000000") {
      p.textColor = preset.body.color;
    }
    if (!p.headingColor) {
      p.headingColor = preset.headings.h1.color;
    }
    if (!p.bgColor || p.bgColor === "#ffffff") {
      p.bgColor = preset.pageBackground;
    }
    if (!p.textMuted) {
      p.textMuted = preset.mutedTextColor;
    }
    if (!p.accentColor || p.accentColor === "#0000ff") {
      p.accentColor = preset.accentColor;
    }
    if (!p.tableHeaderBg) {
      p.tableHeaderBg = preset.table.headerBgColor;
    }
    if (!p.codeBg) {
      p.codeBg = preset.inlineCode.bgColor;
    }
    if (!p.codeBlockBg) {
      p.codeBlockBg = preset.codeBlock.bgColor;
    }
    if (!p.codeBlockText) {
      p.codeBlockText = preset.codeBlock.color;
    }
    if (!p.blockquoteBg) {
      p.blockquoteBg = preset.blockquote.bgColor;
    }
    if (!p.blockquoteBorder) {
      p.blockquoteBorder = preset.blockquote.borderLeftColor;
    }
    if (!p.selectionBg) {
      p.selectionBg = preset.selectionBg;
    }
    if (!p.borderColor) {
      p.borderColor = preset.table.borderColor;
    }

    if (!t.bodyFontFamily || t.bodyFontFamily === "Georgia, serif") {
      t.bodyFontFamily = preset.body.fontFamily;
    }
    if (!t.headingFontFamily) {
      t.headingFontFamily = preset.headings.h1.fontFamily;
    }
    if (!t.baseFontSize) {
      t.baseFontSize = `${preset.body.fontSize}px`;
    }
    if (t.baseLineHeight < 1.5) {
      t.baseLineHeight = preset.body.lineHeight;
    }

    st.fontBody = preset.body.fontFamily;
    st.fontHeading = preset.headings.h1.fontFamily;
    st.lineHeightBody = preset.body.lineHeight;
    st.lineHeightHeading = preset.headings.h1.lineHeight;

    const issues = validateDocumentStyle(this.themeToParadigm(theme));
    for (const issue of issues) {
      if (issue.level === "error") {
        console.warn(`[PdfExtractor] ${issue.element}: ${issue.message}`);
      }
    }
  }

  /**
   * 将 ThemeStyle 转换为 DocumentStyleParadigm 用于 WCAG 验证
   */
  private themeToParadigm(theme: ThemeStyle): DocumentStyleParadigm {
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
        fontSize: parseInt(theme.typography.baseFontSize) || 16,
        fontWeight: 400,
        color: theme.palette.textColor,
        lineHeight: theme.typography.baseLineHeight,
      },
      blockquote: {
        fontFamily: theme.seedTypography.fontBody,
        fontSize: Math.max(13, (parseInt(theme.typography.baseFontSize) || 16) - 2),
        fontWeight: 400,
        color: theme.palette.textMuted,
        lineHeight: theme.typography.baseLineHeight - 0.15,
        borderLeftColor: theme.palette.blockquoteBorder,
        bgColor: theme.palette.blockquoteBg,
      },
      codeBlock: {
        fontFamily: theme.typography.codeFontFamily,
        fontSize: Math.max(12, (parseInt(theme.typography.baseFontSize) || 16) - 3),
        fontWeight: 400,
        color: theme.palette.codeBlockText || theme.palette.textColor,
        lineHeight: theme.seedTypography.lineHeightCode,
        bgColor: theme.palette.codeBlockBg,
      },
      inlineCode: {
        fontSize: Math.max(12, (parseInt(theme.typography.baseFontSize) || 16) - 3),
        color: theme.palette.accentColor,
        bgColor: theme.palette.codeBg,
      },
      table: {
        headerFontFamily: theme.seedTypography.fontHeading,
        headerFontSize: Math.max(12, (parseInt(theme.typography.baseFontSize) || 16) - 3),
        headerFontWeight: 700,
        headerColor: "#ffffff",
        headerBgColor: theme.palette.tableHeaderBg,
        headerLineHeight: 1.4,

        cellFontFamily: theme.seedTypography.fontBody,
        cellFontSize: Math.max(11, (parseInt(theme.typography.baseFontSize) || 16) - 4),
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
}
