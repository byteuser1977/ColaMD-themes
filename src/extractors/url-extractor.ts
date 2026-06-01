/**
 * Web 页面样式提取器 — v2.0
 *
 * 增强功能：
 * 1. 从 CSS 规则和内联样式中提取完整的元素样式定义
 * 2. 提取各级标题（H1-H6）的字体、字号、颜色、行高
 * 3. 提取正文字体、字号、行间距、字间距
 * 4. 提取表格（表头/单元格）的完整样式
 * 5. 检测代码块、引用块等特殊元素样式
 * 6. 集成 DocxStyleParadigm 标准参考值填充缺失字段
 * 7. 自动验证 WCAG 对比度合规性
 *
 * 技术优势（相比 PDF）：
 * - 可直接从 <style> 标签和外部 CSS 中解析规则级样式
 * - 可从 DOM 元素的 style 属性获取内联样式
 * - 可通过 cheerio 获取元素的 computed-style 近似值
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { parse, walk, generate } from "css-tree";
import type { Extractor } from "./base.js";
import {
  type ThemeStyle,
  makeThemeStyle,
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

/** 解析后的 CSS 规则集合 */
type CssRuleMap = Map<string, Map<string, string>>;

/** 单个选择器匹配到的样式属性 */
interface ElementStyles {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  lineHeight?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderLeftColor?: string;
  letterSpacing?: string;
}

export class UrlExtractor implements Extractor {
  canHandle(source: string): boolean {
    return /^https?:\/\//i.test(source);
  }

  /**
   * Validate URL to prevent SSRF attacks and ensure security.
   * - Only allows http/https protocols
   * - Blocks private network addresses (localhost, 10.x, 172.16-31.x, 192.168.x, 169.254.x)
   */
  private validateUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }

    // Protocol whitelist
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are allowed.`);
    }

    // Block private network ranges to prevent SSRF
    const hostname = parsed.hostname.toLowerCase();
    const isPrivate =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.20.") ||
      hostname.startsWith("172.21.") ||
      hostname.startsWith("172.22.") ||
      hostname.startsWith("172.23.") ||
      hostname.startsWith("172.24.") ||
      hostname.startsWith("172.25.") ||
      hostname.startsWith("172.26.") ||
      hostname.startsWith("172.27.") ||
      hostname.startsWith("172.28.") ||
      hostname.startsWith("172.29.") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.");

    if (isPrivate) {
      throw new Error(`Private network access denied: ${hostname}. Only public URLs are allowed for security reasons.`);
    }
  }

  async extract(source: string): Promise<ThemeStyle> {
    this.validateUrl(source);

    const response = await axios.get(source, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ColaMD-Themes/1.0)" },
      timeout: 15000,
      maxRedirects: 3,
      maxContentLength: 10 * 1024 * 1024,
      responseType: "text",
    });

    const contentType = String(response.headers["content-type"] || "");
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(
        `URL 返回非 HTML 内容 (${contentType})，请使用对应的文件类型命令`
      );
    }

    const html = typeof response.data === "string" ? response.data : String(response.data);
    const $ = cheerio.load(html);
    const theme = makeThemeStyle(this.detectName($, source), "url", source);

    const styleCss = this.extractAllStyles($);
    const cssRules = this.parseCssRules(styleCss);

    this.extractBodyStyles(theme, cssRules, $);
    this.extractHeadingStyles(theme, cssRules, $);
    this.extractTableStyles(theme, cssRules, $);
    this.extractCodeStyles(theme, cssRules, $);
    this.extractBlockquoteStyles(theme, cssRules, $);
    this.extractLinkAndAccent(theme, cssRules, $);
    this.inferDocumentCharacteristics(theme, $);

    this.applyParadigmDefaults(theme);
    normalizeThemeStyle(theme);
    return theme;
  }

  /**
   * 从页面标题或 URL 推断主题名称
   */
  private detectName($: cheerio.CheerioAPI, url: string): string {
    const title = $("title").text().trim();
    if (title) {
      return title
        .replace(/\s+/g, "-")
        .replace(/[|:/\\.<>?*]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 60);
    }
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      return hostname.split(".")[0] || "web-theme";
    } catch {
      return "web-theme";
    }
  }

  /**
   * 提取所有 <style> 标签内的 CSS 文本
   */
  private extractAllStyles($: cheerio.CheerioAPI): string {
    const parts: string[] = [];
    $("style").each((_, el) => {
      const text = $(el).text().trim();
      if (text && !text.includes("@font-face")) {
        parts.push(text);
      }
    });
    return parts.join("\n");
  }

  /**
   * 使用 css-tree 将 CSS 文本解析为结构化规则映射
   */
  private parseCssRules(css: string): CssRuleMap {
    const result = new Map<string, Map<string, string>>();
    try {
      const ast = parse(css, {
        parseAtrulePrelude: false,
        parseRulePrelude: false,
      });
      walk(ast, {
        visit: "Rule",
        enter(node) {
          const prelude = generate(node.prelude).trim();
          const props = new Map<string, string>();
          walk(node.block, {
            visit: "Declaration",
            enter(decl) {
              props.set(decl.property.toLowerCase(), generate(decl.value));
            },
          });
          if (props.size > 0) {
            result.set(prelude, props);
          }
        },
      });
    } catch {
      // CSS 解析错误不阻断流程
    }
    return result;
  }

  /**
   * 提取正文（body/html）完整样式
   */
  private extractBodyStyles(
    theme: ThemeStyle,
    rules: CssRuleMap,
    $: cheerio.CheerioAPI
  ): void {
    const p = theme.palette;
    const t = theme.typography;
    const st = theme.seedTypography;

    const bodyStyles = this.resolveElementStyles(rules, $, [
      "body",
      "html",
      ":root",
      "#app",
      "#root",
      ".container",
      "main",
    ]);

    if (bodyStyles.fontFamily) {
      t.bodyFontFamily = this.normalizeFontFamily(bodyStyles.fontFamily);
      st.fontBody = t.bodyFontFamily;
    }

    if (bodyStyles.fontSize) {
      t.baseFontSize = this.normalizeFontSize(bodyStyles.fontSize);
      st.fontSizeRoot = t.baseFontSize;
    }

    if (bodyStyles.color) {
      p.textColor = this.normalizeColor(bodyStyles.color);
    }

    if (bodyStyles.backgroundColor) {
      p.bgColor = this.normalizeColor(bodyStyles.backgroundColor);
    }

    if (bodyStyles.lineHeight) {
      const lh = parseFloat(bodyStyles.lineHeight);
      if (lh >= 1.2 && lh <= 2.5) {
        t.baseLineHeight = lh;
        st.lineHeightBody = lh;
      }
    }

    // 从 body 标签的内联样式或属性补充
    const bodyTag = $("body");
    const inlineBg = bodyTag.attr("style")?.match(/background(?:-color)?:\s*([^;]+)/i)?.[1];
    if (inlineBg && !p.bgColor) {
      p.bgColor = this.normalizeColor(inlineBg);
    }
  }

  /**
   * 提取 H1-H6 各级标题的完整样式定义
   */
  private extractHeadingStyles(
    theme: ThemeStyle,
    rules: CssRuleMap,
    $: cheerio.CheerioAPI
  ): void {
    const headingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"];
    const st = theme.seedTypography;
    const rootSize =
      parseFloat(theme.typography.baseFontSize) || 16;

    for (const level of headingLevels) {
      const styles = this.resolveElementStyles(rules, $, [level]);

      if (styles.fontSize) {
        const pxSize = this.normalizeFontSizeToPx(styles.fontSize, rootSize);
        const scale = pxSize / rootSize;

        switch (level) {
          case "h1":
            st.fontScaleH1 = Math.max(st.fontScaleH1, scale);
            break;
          case "h2":
            st.fontScaleH2 = Math.max(st.fontScaleH2, scale);
            break;
          case "h3":
            st.fontScaleH3 = Math.max(st.fontScaleH3, scale);
            break;
          case "h4":
            st.fontScaleH4 = Math.max(st.fontScaleH4, scale);
            break;
          case "h5":
            st.fontScaleH5 = Math.max(st.fontScaleH5, scale);
            break;
          case "h6":
            st.fontScaleH6 = Math.max(st.fontScaleH6, scale);
            break;
        }
      }

      if (styles.fontWeight) {
        const weight = parseInt(styles.fontWeight) || 400;
        if (weight > theme.typography.headingWeight) {
          theme.typography.headingWeight = Math.min(weight, 900);
        }
      }

      if (styles.color && level === "h1") {
        theme.palette.headingColor = this.normalizeColor(styles.color);
      }

      if (styles.fontFamily && level === "h1") {
        theme.typography.headingFontFamily = this.normalizeFontFamily(
          styles.fontFamily
        );
        st.fontHeading = theme.typography.headingFontFamily;
      }

      if (styles.lineHeight && level === "h1") {
        const lh = parseFloat(styles.lineHeight);
        if (lh >= 1.1 && lh <= 1.6) {
          st.lineHeightHeading = lh;
        }
      }
    }

    // 如果没有提取到标题字体，使用正文字体族
    if (!theme.typography.headingFontFamily) {
      theme.typography.headingFontFamily = theme.typography.bodyFontFamily;
      st.fontHeading = st.fontBody;
    }
  }

  /**
   * 提取表格（th/td）完整样式
   */
  private extractTableStyles(
    theme: ThemeStyle,
    rules: CssRuleMap,
    $: cheerio.CheerioAPI
  ): void {
    const p = theme.palette;

    const thStyles = this.resolveElementStyles(rules, $, [
      "th",
      "thead th",
      "table th",
      ".table th",
    ]);

    if (thStyles.backgroundColor) {
      p.tableHeaderBg = this.normalizeColor(thStyles.backgroundColor);
    }
    if (thStyles.color) {
      // 表头文字色暂存到 headingColor 备用
      if (!p.headingColor) p.headingColor = this.normalizeColor(thStyles.color);
    }
    if (thStyles.borderColor) {
      p.borderColor = this.normalizeColor(thStyles.borderColor);
    }

    const tdStyles = this.resolveElementStyles(rules, $, [
      "td",
      "tbody td",
      "table td",
      ".table td",
    ]);

    if (tdStyles.backgroundColor) {
      p.codeBg = this.normalizeColor(tdStyles.backgroundColor);
    }

    const tableStyles = this.resolveElementStyles(rules, $, [
      "table",
      ".table",
    ]);

    if (tableStyles.borderColor) {
      p.borderColor = p.borderColor || this.normalizeColor(tableStyles.borderColor);
    }

    // 检查页面是否包含表格元素
    if ($("table").length > 0 && !p.tableHeaderBg) {
      p.tableHeaderBg = ACADEMIC_PAPER_DEFAULTS.table.headerBgColor;
    }
  }

  /**
   * 提取代码块和内联代码样式
   */
  private extractCodeStyles(
    theme: ThemeStyle,
    rules: CssRuleMap,
    $: cheerio.CheerioAPI
  ): void {
    const p = theme.palette;

    const preStyles = this.resolveElementStyles(rules, $, [
      "pre",
      "code pre",
      "pre code",
      ".code-block",
      "pre[class]",
    ]);

    if (preStyles.backgroundColor) {
      p.codeBlockBg = this.normalizeColor(preStyles.backgroundColor);
    }
    if (preStyles.color) {
      p.codeBlockText = this.normalizeColor(preStyles.color);
    }

    const codeStyles = this.resolveElementStyles(rules, $, [
      "code",
      "p code",
      "li code",
      "inline-code",
      ":not(pre) > code",
    ]);

    if (codeStyles.backgroundColor) {
      p.codeBg = this.normalizeColor(codeStyles.backgroundColor);
    }
    if (codeStyles.color) {
      // 内联代码颜色暂存
    }

    // 检测代码高亮库的存在
    const hasHighlightJs = $("pre code.hljs").length > 0;
    const hasPrismjs = $("pre[class*=language-]").length > 0;
    if (hasHighlightJs || hasPrismjs) {
      if (!p.codeBlockBg) p.codeBlockBg = "#282c34";
      if (!p.codeBlockText) p.codeBlockText = "#abb2bf";
    }
  }

  /**
   * 提取引用块样式
   */
  private extractBlockquoteStyles(
    theme: ThemeStyle,
    rules: CssRuleMap,
    $: cheerio.CheerioAPI
  ): void {
    const p = theme.palette;

    const bqStyles = this.resolveElementStyles(rules, $, [
      "blockquote",
      "blockquote p",
      ".blockquote",
    ]);

    if (bqStyles.backgroundColor) {
      p.blockquoteBg = this.normalizeColor(bqStyles.backgroundColor);
    }
    if (bqStyles.borderLeftColor) {
      p.blockquoteBorder = this.normalizeColor(bqStyles.borderLeftColor);
    } else if (bqStyles.borderColor) {
      p.blockquoteBorder = this.normalizeColor(bqStyles.borderColor);
    }
  }

  /**
   * 提取链接和强调色
   */
  private extractLinkAndAccent(
    theme: ThemeStyle,
    rules: CssRuleMap,
    $: cheerio.CheerioAPI
  ): void {
    const p = theme.palette;

    const linkStyles = this.resolveElementStyles(rules, $, [
      "a",
      "a:link",
      "a:not(:visited)",
    ]);

    if (linkStyles.color) {
      p.accentColor = this.normalizeColor(linkStyles.color);
    }

    // 也检查 strong/b 元素的颜色
    const strongStyles = this.resolveElementStyles(rules, $, [
      "strong",
      "b",
      ".strong",
    ]);

    if (strongStyles.color && !p.accentColor) {
      p.accentColor = this.normalizeColor(strongStyles.color);
    }
  }

  /**
   * 综合推断文档特征（语言、类型、风格）
   */
  private inferDocumentCharacteristics(
    theme: ThemeStyle,
    $: cheerio.CheerioAPI
  ): void {
    const htmlText = $("body").text();
    const hasChinese = /[\u4e00-\u9fa5]/.test(htmlText.slice(0, 2000));

    // 检测常见框架/站点特征
    const isGitHub = /github\.com/i.test(theme.sourceUrl);
    const isDocsSite =
      /docs?|documentation|wiki|help/i.test(theme.sourceUrl + $("title").text());
    const isBlog = /blog|article|post/i.test(
      theme.sourceUrl + $("title").text()
    );

    if (isGitHub) {
      theme.description = `${theme.description} [GitHub 页面]`;
    } else if (isDocsSite) {
      theme.description = `${theme.description} [技术文档站]`;
    } else if (isBlog) {
      theme.description = `${theme.description} [博客/文章页]`;
    }

    // 根据语言特征微调默认配色
    if (hasChinese && !theme.palette.textColor) {
      theme.typography.bodyFontFamily =
        ACADEMIC_PAPER_DEFAULTS.body.fontFamily;
      theme.seedTypography.fontBody = ACADEMIC_PAPER_DEFAULTS.body.fontFamily;
    }
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
    if (!p.bgColor || p.bgColor === "#ffffff" || p.bgColor === "#fff") {
      p.bgColor = preset.pageBackground;
    }
    if (!p.textMuted) {
      p.textMuted = preset.mutedTextColor;
    }
    if (!p.accentColor || p.accentColor === "#0000ff" || p.accentColor === "#00f") {
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

    if (
      !t.bodyFontFamily ||
      t.bodyFontFamily === "Georgia, serif"
    ) {
      t.bodyFontFamily = preset.body.fontFamily;
    }
    if (!t.headingFontFamily) {
      t.headingFontFamily = preset.headings.h1.fontFamily;
    }
    if (!t.baseFontSize) {
      t.baseFontSize = `${preset.body.fontSize}px`;
    }
    if (t.baseLineHeight < 1.4) {
      t.baseLineHeight = preset.body.lineHeight;
    }

    st.fontBody = st.fontBody || preset.body.fontFamily;
    st.fontHeading = st.fontHeading || preset.headings.h1.fontFamily;
    st.lineHeightBody = st.lineHeightBody || preset.body.lineHeight;
    st.lineHeightHeading =
      st.lineHeightHeading || preset.headings.h1.lineHeight;

    // 确保标题字号倍率符合范式约束
    if (st.fontScaleH1 < 1.75) st.fontScaleH1 = preset.headings.h1.fontSize / 16;
    if (st.fontScaleH2 < st.fontScaleH1 * 0.8)
      st.fontScaleH2 = preset.headings.h2.fontSize / 16;
    if (st.fontScaleH3 < st.fontScaleH2 * 0.85)
      st.fontScaleH3 = preset.headings.h3.fontSize / 16;

    const issues = validateDocumentStyle(this.themeToParadigm(theme));
    for (const issue of issues) {
      if (issue.level === "error") {
        console.warn(`[UrlExtractor] ${issue.element}: ${issue.message}`);
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
        fontSize: Math.max(
          13,
          (parseInt(theme.typography.baseFontSize) || 16) - 2
        ),
        fontWeight: 400,
        color: theme.palette.textMuted,
        lineHeight: theme.typography.baseLineHeight - 0.15,
        borderLeftColor: theme.palette.blockquoteBorder,
        bgColor: theme.palette.blockquoteBg,
      },
      codeBlock: {
        fontFamily: theme.typography.codeFontFamily,
        fontSize: Math.max(
          12,
          (parseInt(theme.typography.baseFontSize) || 16) - 3
        ),
        fontWeight: 400,
        color:
          theme.palette.codeBlockText || theme.palette.textColor,
        lineHeight: theme.seedTypography.lineHeightCode,
        bgColor: theme.palette.codeBlockBg,
      },
      inlineCode: {
        fontSize: Math.max(
          12,
          (parseInt(theme.typography.baseFontSize) || 16) - 3
        ),
        color: theme.palette.accentColor,
        bgColor: theme.palette.codeBg,
      },
      table: {
        headerFontFamily: theme.seedTypography.fontHeading,
        headerFontSize: Math.max(
          12,
          (parseInt(theme.typography.baseFontSize) || 16) - 3
        ),
        headerFontWeight: 700,
        headerColor: "#ffffff",
        headerBgColor: theme.palette.tableHeaderBg,
        headerLineHeight: 1.4,

        cellFontFamily: theme.seedTypography.fontBody,
        cellFontSize: Math.max(
          11,
          (parseInt(theme.typography.baseFontSize) || 16) - 4
        ),
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

  // ═══════════════════════════════════════════════════════════
  // 工具方法：CSS 属性解析与规范化
  // ═══════════════════════════════════════════════════════════

  /**
   * 为一组选择器查找匹配的 CSS 规则并合并结果
   * 优先级：更具体的选择器 > 更通用的选择器 > 内联样式
   */
  private resolveElementStyles(
    rules: CssRuleMap,
    $: cheerio.CheerioAPI,
    selectors: string[]
  ): ElementStyles {
    const merged: ElementStyles = {};

    for (const selector of selectors) {
      const ruleProps = this.findBestMatchingRule(rules, selector);
      if (ruleProps) {
        if (ruleProps.get("font-family") && !merged.fontFamily)
          merged.fontFamily = ruleProps.get("font-family");
        if (ruleProps.get("font-size") && !merged.fontSize)
          merged.fontSize = ruleProps.get("font-size");
        if (ruleProps.get("font-weight") && !merged.fontWeight)
          merged.fontWeight = ruleProps.get("font-weight");
        if (ruleProps.get("color") && !merged.color)
          merged.color = ruleProps.get("color");
        if (ruleProps.get("line-height") && !merged.lineHeight)
          merged.lineHeight = ruleProps.get("line-height");
        if (ruleProps.get("background-color") && !merged.backgroundColor)
          merged.backgroundColor = ruleProps.get("background-color");
        if (ruleProps.get("border-left-color") && !merged.borderColor)
          merged.borderColor = ruleProps.get("border-left-color");
        if (ruleProps.get("border-color") && !merged.borderColor)
          merged.borderColor = ruleProps.get("border-color");
        if (ruleProps.get("letter-spacing") && !merged.letterSpacing)
          merged.letterSpacing = ruleProps.get("letter-spacing");
      }
    }

    // 补充内联样式（最高优先级）
    for (const selector of selectors) {
      try {
        const el = $(selector).first();
        if (el.length) {
          const inlineAttr = el.attr("style");
          if (inlineAttr) {
            const inlineMap = this.parseInlineStyle(inlineAttr);
            if (inlineMap.fontFamily) merged.fontFamily = inlineMap.fontFamily;
            if (inlineMap.fontSize) merged.fontSize = inlineMap.fontSize;
            if (inlineMap.fontWeight) merged.fontWeight = inlineMap.fontWeight;
            if (inlineMap.color) merged.color = inlineMap.color;
            if (inlineMap.lineHeight) merged.lineHeight = inlineMap.lineHeight;
            if (inlineMap.backgroundColor)
              merged.backgroundColor = inlineMap.backgroundColor;
          }
        }
      } catch {
        // 选择器可能无效，跳过
      }
    }

    return merged;
  }

  /**
   * 在 CSS 规则中查找最佳匹配的选择器
   */
  private findBestMatchingRule(
    rules: CssRuleMap,
    targetSelector: string
  ): Map<string, string> | undefined {
    let bestMatch: Map<string, string> | undefined;
    let bestSpecificity = -1;

    for (const [selector, props] of rules) {
      if (
        selector.includes(targetSelector) ||
        targetSelector.includes(selector.replace(/[.#\[\]>+~]/g, "").split(" ").pop() || "")
      ) {
        const specificity = this.calculateSpecificity(selector);
        if (specificity > bestSpecificity) {
          bestSpecificity = specificity;
          bestMatch = props;
        }
      }
    }

    return bestMatch;
  }

  /**
   * 计算选择器特异性（简化版）
   */
  private calculateSpecificity(selector: string): number {
    let score = 0;
    score += (selector.match(/#/g) || []).length * 100;
    score += (selector.match(/\./g) || []).length * 10;
    score += (selector.match(/[a-zA-Z]/g) || []).length;
    return score;
  }

  /**
   * 解析内联 style 字符串为键值对
   */
  private parseInlineStyle(styleStr: string): Partial<ElementStyles> {
    const result: Partial<ElementStyles> = {};
    const declarations = styleStr.split(";");

    for (const decl of declarations) {
      const colonIndex = decl.indexOf(":");
      if (colonIndex === -1) continue;

      const prop = decl.slice(0, colonIndex).trim().toLowerCase();
      const value = decl.slice(colonIndex + 1).trim();

      switch (prop) {
        case "font-family":
          result.fontFamily = value;
          break;
        case "font-size":
          result.fontSize = value;
          break;
        case "font-weight":
          result.fontWeight = value;
          break;
        case "color":
          result.color = value;
          break;
        case "line-height":
          result.lineHeight = value;
          break;
        case "background-color":
        case "background":
          result.backgroundColor = value;
          break;
        case "border-color":
        case "border-left-color":
          result.borderColor = value;
          break;
        case "letter-spacing":
          result.letterSpacing = value;
          break;
      }
    }

    return result;
  }

  /**
   * 规范化字体家族名称（去除引号、清理多余空格）
   */
  private normalizeFontFamily(fontFamily: string): string {
    return fontFamily
      .replace(/['"]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  /**
   * 规范化字号为 px 单位
   */
  private normalizeFontSize(sizeStr: string): string {
    return `${this.normalizeFontSizeToPx(sizeStr, 16)}px`;
  }

  /**
   * 将字号转换为 px 数值
   */
  private normalizeFontSizeToPx(sizeStr: string, rootPx: number): number {
    const trimmed = sizeStr.trim();

    // em/rem 单位转换
    const emMatch = trimmed.match(/^([\d.]+)(em|rem)$/i);
    if (emMatch) {
      return parseFloat(emMatch[1]) * rootPx;
    }

    // pt → px 转换 (1pt ≈ 1.333px)
    const ptMatch = trimmed.match(/^([\d.]+)pt$/i);
    if (ptMatch) {
      return parseFloat(ptMatch[1]) * 1.333;
    }

    // 直接是 px 或无单位数字
    const pxMatch = trimmed.match(/^([\d.]+)(px)?$/i);
    if (pxMatch) {
      return parseFloat(pxMatch[1]);
    }

    // 关键字号映射
    const keywordSizes: Record<string, number> = {
      "xx-small": 10,
      "x-small": 12,
      small: 14,
      medium: 16,
      large: 18,
      "x-large": 20,
      "xx-large": 24,
    };

    if (keywordSizes[trimmed]) {
      return keywordSizes[trimmed];
    }

    return rootPx;
  }

  /**
   * 规范化颜色值为标准 hex 格式
   */
  private normalizeColor(colorStr: string): string {
    const trimmed = colorStr.trim().toLowerCase();

    // 已经是 hex 格式
    if (/^#[0-9a-f]{3,8}$/.test(trimmed)) {
      return trimmed;
    }

    // rgb()/rgba() 格式
    const rgbMatch = trimmed.match(
      /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/
    );
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }

    // 透明色返回空字符串
    if (trimmed === "transparent" || trimmed === "none" || trimmed === "initial" || trimmed === "inherit") {
      return "";
    }

    // 返回原值（可能是 named color 等）
    return trimmed;
  }
}
