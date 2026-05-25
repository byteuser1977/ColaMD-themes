/**
 * DOCX 文档样式提取器 — v2.0
 *
 * 增强功能：
 * 1. 提取各级标题（H1-H6）的完整字体样式定义
 * 2. 提取正文字体、字号、颜色、行间距
 * 3. 提取表格样式（表头/单元格字体、背景色、边框）
 * 4. 对无法提取的样式应用 DocxStyleParadigm 标准参考值
 * 5. 自动验证 WCAG 对比度合规性
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import mammoth from "mammoth";
import type { Extractor } from "./base.js";
import {
  makeThemeStyle,
  type ThemeStyle,
  type ColorPalette,
  type Typography,
} from "../models.js";
import { normalizeThemeStyle, hexToRgb, rgbToHex, lighten, darken } from "../color-utils.js";
import {
  ACADEMIC_PAPER_DEFAULTS,
  getRecommendedPreset,
  validateDocumentStyle,
  normalizeForPrinting,
  type DocumentStyleParadigm,
  type FontStyleDefinition,
  type TableCellStyle,
} from "../docx-style-paradigm.js";

export class DocxExtractor implements Extractor {
  canHandle(source: string): boolean {
    return /\.docx$/i.test(source);
  }

  async extract(source: string): Promise<ThemeStyle> {
    const buffer = readFileSync(source);
    const name = basename(source).replace(/\.docx$/i, "");
    const theme = makeThemeStyle(name, "docx", source);

    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Heading 5'] => h5:fresh",
          "p[style-name='Heading 6'] => h6:fresh",
          "r[style-name='Strong'] => strong",
        ],
      }
    );

    if (result.value) {
      this.extractDetailedStyles(theme, result.value);
    }

    this.applyParadigmDefaults(theme);
    normalizeThemeStyle(theme);
    return theme;
  }

  /**
   * 从 HTML 输出中提取详细的文档元素样式
   */
  private extractDetailedStyles(theme: ThemeStyle, html: string): void {
    const p = theme.palette;
    const t = theme.typography;

    this.extractBodyStyles(t, html);
    this.extractHeadingStyles(theme, html);
    this.extractTableStyles(p, html);
    this.extractColorPalette(p, html);
    this.extractBlockStyles(p, html);
  }

  /**
   * 提取正文基础样式（字体、字号、行高）
   */
  private extractBodyStyles(typography: Typography, html: string): void {
    const fontMatch = html.match(/font-family:\s*['"]?([^;'"]+)['"]?/i);
    if (fontMatch) {
      typography.bodyFontFamily = fontMatch[1].trim();
    }

    const fontSizeMatch = html.match(/font-size:\s*([\d.]+)(pt|px)/i);
    if (fontSizeMatch) {
      const size = parseFloat(fontSizeMatch[1]);
      const unit = fontSizeMatch[2];
      typography.baseFontSize = unit === "pt" ? `${size * 1.333}px` : `${size}px`;
    }
  }

  /**
   * 提取各级标题的详细样式
   */
  private extractHeadingStyles(theme: ThemeStyle, html: string): void {
    const headingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"];

    for (const level of headingLevels) {
      const regex = new RegExp(
        `<${level}[^>]*style="[^"]*"`,
        "gi"
      );
      let match = regex.exec(html);

      if (match) {
        const styleStr = match[0];
        const extracted = this.parseInlineStyle(styleStr);

        if (extracted.fontSize) {
          const size = parseFloat(extracted.fontSize);
          const unit = extracted.fontSize.replace(/[\d.]/g, "") || "px";
          const pxSize = unit === "pt" ? size * 1.333 : size;

          switch (level) {
            case "h1": theme.seedTypography.fontScaleH1 = pxSize / 16; break;
            case "h2": theme.seedTypography.fontScaleH2 = pxSize / 16; break;
            case "h3": theme.seedTypography.fontScaleH3 = pxSize / 16; break;
            case "h4": theme.seedTypography.fontScaleH4 = pxSize / 16; break;
            case "h5": theme.seedTypography.fontScaleH5 = pxSize / 16; break;
            case "h6": theme.seedTypography.fontScaleH6 = pxSize / 16; break;
          }
        }

        if (extracted.fontWeight) {
          const weight = parseInt(extracted.fontWeight) || 700;
          if (weight > theme.typography.headingWeight) {
            theme.typography.headingWeight = weight;
          }
        }

        if (extracted.color && level === "h1") {
          theme.palette.headingColor = extracted.color;
        }
      }
    }
  }

  /**
   * 提取表格详细样式（表头、单元格、边框）
   */
  private extractTableStyles(palette: ColorPalette, html: string): void {
    const thRegex = /<th[^>]*style="([^"]*)"/gi;
    let thMatch = thRegex.exec(html);

    if (thMatch) {
      const thStyle = this.parseInlineStyle(thMatch[0]);
      if (thStyle.backgroundColor) {
        palette.tableHeaderBg = thStyle.backgroundColor;
      }
      if (thStyle.color) {
        palette.headingColor = palette.headingColor || thStyle.color;
      }
      if (thStyle.fontSize) {
        const size = parseFloat(thStyle.fontSize);
        palette.tableHeaderBg = palette.tableHeaderBg || "#f0f0f0";
      }
    }

    const tdRegex = /<td[^>]*style="([^"]*)"/gi;
    let tdMatch = tdRegex.exec(html);
    if (tdMatch) {
      const tdStyle = this.parseInlineStyle(tdMatch[0]);
      if (tdStyle.backgroundColor) {
        palette.codeBg = tdStyle.backgroundColor;
      }
    }

    const tableBorderMatch = html.match(/<table[^>]*style="[^"]*border[^;]*:[^;]*([^;"'\s]+)/i);
    if (tableBorderMatch) {
      palette.borderColor = palette.borderColor || "#cccccc";
    }

    if (!palette.tableHeaderBg) {
      palette.tableHeaderBg = "#f0f0f0";
    }
  }

  /**
   * 提取全局色彩方案
   */
  private extractColorPalette(palette: ColorPalette, html: string): void {
    const colorMatch = html.match(/color:\s*(#[0-9a-fA-F]{3,6})/i);
    if (colorMatch) {
      palette.textColor = colorMatch[1];
    }

    const bgMatch = html.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/i);
    if (bgMatch && bgMatch[1].toLowerCase() !== "#ffffff") {
      palette.bgColor = bgMatch[1];
    }

    const strongMatch = html.match(/<strong[^>]*style="[^"]*color:\s*(#[0-9a-fA-F]{3,6})/i);
    if (strongMatch) {
      palette.accentColor = strongMatch[1];
    }

    const linkMatch = html.match(/<a[^>]*style="[^"]*color:\s*(#[0-9a-fA-F]{3,6})/i);
    if (linkMatch) {
      palette.accentColor = linkMatch[1];
    }
  }

  /**
   * 提取引用块和代码块样式
   */
  private extractBlockStyles(palette: ColorPalette, html: string): void {
    const preMatch = html.match(/<pre[^>]*style="[^"]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/i);
    if (preMatch) {
      palette.codeBlockBg = preMatch[1];
    }

    const preColorMatch = html.match(/<pre[^>]*style="[^"]*color:\s*(#[0-9a-fA-F]{3,6})/i);
    if (preColorMatch) {
      palette.codeBlockText = preColorMatch[1];
    }

    if (!palette.blockquoteBorder) {
      palette.blockquoteBorder = palette.accentColor;
    }
  }

  /**
   * 解析内联 style 字符串为键值对对象
   */
  private parseInlineStyle(styleTag: string): Record<string, string> {
    const styleMatch = styleTag.match(/style="([^"]*)"/i);
    if (!styleMatch) return {};

    const styles: Record<string, string> = {};
    const declarations = styleMatch[1].split(";");

    for (const decl of declarations) {
      const [prop, ...valueParts] = decl.split(":").map((s) => s.trim());
      if (prop && valueParts.length > 0) {
        const camelProp = prop.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
        styles[camelProp] = valueParts.join(":").trim();
      }
    }

    return styles;
  }

  /**
   * 应用 DocxStyleParadigm 标准参考值填充缺失字段
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
    if (!p.blockquoteBg) {
      p.blockquoteBg = preset.blockquote.bgColor;
    }
    if (!p.selectionBg) {
      p.selectionBg = preset.selectionBg;
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
        console.warn(`[DocxExtractor] ${issue.element}: ${issue.message}`);
      }
    }
  }

  /**
   * 将 ThemeStyle 转换为 DocumentStyleParadigm 用于验证
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
          fontWeight: theme.typography.headingWeight - 100 || 600,
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
