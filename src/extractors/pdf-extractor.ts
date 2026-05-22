/** Extract theme styles from PDF documents. */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { Extractor } from "./base.js";
import { makeThemeStyle, type ThemeStyle, type ColorPalette } from "../models.js";
import { normalizeThemeStyle } from "../color-utils.js";

// pdf-parse doesn't have great TS types; we import it dynamically
type PDFData = {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

interface FontInfo {
  fontName: string;
  fontSize: number;
  isBold: boolean;
}

export class PdfExtractor implements Extractor {
  canHandle(source: string): boolean {
    return /\.pdf$/i.test(source);
  }

  async extract(source: string): Promise<ThemeStyle> {
    const name = basename(source).replace(/\.pdf$/i, "");
    const theme = makeThemeStyle(name, "pdf", source);

    try {
      // Dynamic import of pdf-parse
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = readFileSync(source);
      const data: PDFData = await pdfParse(buffer);

      if (data.text) {
        this.populateFromText(theme, data.text);
      }

      if (data.metadata) {
        this.populateFromMetadata(theme, data.metadata);
      }
    } catch (err) {
      // PDF extraction is best-effort; fall back to defaults
      if ((err as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
        throw new Error(
          "pdf-parse is not installed. Run: npm install pdf-parse"
        );
      }
      throw err;
    }

    normalizeThemeStyle(theme);
    return theme;
  }

  private populateFromText(theme: ThemeStyle, text: string): void {
    const p = theme.palette;

    // Analyze font sizes from the rendered text
    // pdf-parse doesn't provide font metadata in its default output,
    // so we use heuristics based on text structure

    // Detect large text (potential headings) by analyzing line structure
    const lines = text.split("\n").filter((l) => l.trim().length > 0);

    // Count uppercase-only short lines as potential headings
    const headingCandidates = lines.filter(
      (l) => l.trim().length < 80 && /^[A-Z0-9\s\-:.,!?]+$/.test(l.trim())
    );

    // If we found heading-like content, bias toward heading styles
    if (headingCandidates.length > 0) {
      p.headingColor = p.headingColor || p.textColor;
    }

    // Check for monospaced-looking text (code blocks)
    // PDFs typically use Courier for code
    const hasMonospace = lines.some(
      (l) => l.includes("  ") && l.trim().length > 40
    );
    if (hasMonospace) {
      p.codeBlockBg = "#1e1e1e";
      p.codeBlockText = "#d4d4d4";
      p.codeBg = "#f0f0f0";
    }
  }

  private populateFromMetadata(
    theme: ThemeStyle,
    metadata: Record<string, unknown>
  ): void {
    // PDF metadata can include title, author, etc.
    if (metadata.Title && typeof metadata.Title === "string") {
      theme.description = `Theme extracted from: ${metadata.Title}`;
    }
  }
}
