/** Extract theme styles from .docx documents. */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import mammoth from "mammoth";
import type { Extractor } from "./base.js";
import { makeThemeStyle, type ThemeStyle, type ColorPalette } from "../models.js";
import { normalizeThemeStyle, hexToRgb, rgbToHex } from "../color-utils.js";

export class DocxExtractor implements Extractor {
  canHandle(source: string): boolean {
    return /\.docx$/i.test(source);
  }

  async extract(source: string): Promise<ThemeStyle> {
    const buffer = readFileSync(source);
    const name = basename(source).replace(/\.docx$/i, "");
    const theme = makeThemeStyle(name, "docx", source);

    // Use mammoth to extract styled HTML
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
      ],
    });

    if (result.value) {
      this.populateFromHtml(theme, result.value);
    }

    // Extract document-level style info from mammoth messages
    normalizeThemeStyle(theme);
    return theme;
  }

  private populateFromHtml(theme: ThemeStyle, html: string): void {
    const p = theme.palette;

    // Extract font-family from style attributes
    const fontFamilyMatch = html.match(/font-family:\s*['"]?([^;'"]+)['"]?/i);
    if (fontFamilyMatch) {
      theme.typography.bodyFontFamily = fontFamilyMatch[1].trim();
    }

    const fontSizeMatch = html.match(/font-size:\s*([\d.]+)(pt|px)/i);
    if (fontSizeMatch) {
      const size = parseFloat(fontSizeMatch[1]);
      const unit = fontSizeMatch[2];
      if (unit === "pt") {
        theme.typography.baseFontSize = `${size * 1.333}px`; // pt to px approximate
      } else {
        theme.typography.baseFontSize = `${size}px`;
      }
    }

    // Extract heading-level font sizes
    const h1Match = html.match(/<h1[^>]*style="[^"]*font-size:\s*([\d.]+)(pt|px)/i);
    if (h1Match) {
      const size = parseFloat(h1Match[1]);
      theme.typography.headingWeight = 700;
    }

    // Detect bold in headings
    if (/<h[1-6][^>]*font-weight:\s*bold/i.test(html) ||
        /<h[1-6][^>]*>\s*<strong>/i.test(html)) {
      p.headingColor = p.headingColor || p.textColor;
    }

    // Extract color from style attributes
    const colorMatch = html.match(/color:\s*(#[0-9a-fA-F]{3,6})/i);
    if (colorMatch) {
      p.textColor = colorMatch[1];
    }

    // Extract background color
    const bgMatch = html.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/i);
    if (bgMatch && bgMatch[1].toLowerCase() !== "#ffffff") {
      p.bgColor = bgMatch[1];
    }

    // Try to detect accent color from links or bold elements
    const strongMatch = html.match(/<strong[^>]*style="[^"]*color:\s*(#[0-9a-fA-F]{3,6})/i);
    if (strongMatch) {
      p.accentColor = strongMatch[1];
    }

    // Detect table background
    const thMatch = html.match(/<th[^>]*style="[^"]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/i);
    if (thMatch) {
      p.tableHeaderBg = thMatch[1];
    }
  }
}
