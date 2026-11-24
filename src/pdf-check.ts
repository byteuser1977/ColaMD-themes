/**
 * Export-PDF content checks — the artifact-side contract (v0.6.2).
 *
 * The theme CSS contract guards what goes INTO the renderer; these checks
 * guard what comes OUT of `page.pdf()`. They parse the produced PDF directly
 * (pdf-parse + raw MediaBox scan) so the CLI can answer "was the export
 * actually faithful?" without opening a viewer:
 *
 *   PDF-01 (MUST)   the PDF parses and has ≥1 page
 *   PDF-02 (MUST*)  page size consistent; slide decks must be 16:9 paper
 *                   (Chromium prints the 1920×1080 slide paper — 20×11.25in —
 *                   as 1440×810 pt)
 *   PDF-03 (MUST*)  slide page count matches the deck markdown
 *   PDF-04 (SHOULD) no blank pages (page text extraction < 5 chars)
 *   PDF-05 (SHOULD) deck chrome fidelity — deck title present in the PDF text
 *
 * (*) enforced only when the source is a slide deck (deck directives present,
 *     or a companion deck markdown was supplied); document exports keep the
 *     historical A4/Letter behavior and only get PDF-01/02-consistency/04.
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import type { ValidationIssue } from "./validators.js";

export interface PdfCheckOptions {
  /** Companion deck markdown — enables page-count and chrome checks. */
  deckMd?: string;
  /** Force slide expectations; auto-detected from the paper ratio when unset. */
  slides?: boolean;
}

export interface PdfCheckResult {
  issues: ValidationIssue[];
  pageCount: number;
  /** Unique MediaBox sizes in pt (w×h) as printed by Chromium. */
  paperSizes: PaperSize[];
  pageTexts: string[];
}

export interface PaperSize {
  w: number;
  h: number;
}

/** MediaBox entries are inherited by pages; unique sizes = paper formats. */
function parseMediaBoxes(buffer: Buffer): PaperSize[] {
  const raw = buffer.toString("latin1");
  const sizes = new Map<string, PaperSize>();
  for (const m of raw.matchAll(/\/MediaBox\s*\[\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\]/g)) {
    const w = Math.abs(Number(m[3]) - Number(m[1]));
    const h = Math.abs(Number(m[4]) - Number(m[2]));
    if (w > 0 && h > 0) sizes.set(`${w.toFixed(1)}x${h.toFixed(1)}`, { w, h });
  }
  return [...sizes.values()];
}

function isSixteenNine(w: number, h: number): boolean {
  const ratio = w / h;
  return Math.abs(ratio - 16 / 9) < 0.01 * (16 / 9);
}

/**
 * Extract per-page text by spawning a clean `node` child process.
 *
 * Why a subprocess: pdf-parse bundles pdf.js v1.10, whose worker mis-parses
 * perfectly valid PDFs when loaded through tsx's esbuild module transform
 * (deterministic "bad XRef entry" FormatError on files that plain `node`
 * parses fine — verified against real Chromium exports). Running pdf-parse in
 * a pristine `node -e` child is deterministic in every environment.
 *
 * The buffer goes over stdin; the child writes one JSON line to stdout.
 */
async function extractPageTexts(buffer: Buffer): Promise<string[]> {
  // Resolve pdf-parse from THIS package's dependency graph, not the child's cwd.
  const pdfParsePath = createRequire(import.meta.url).resolve("pdf-parse");
  const workerScript = `
    const m = require(process.env.PDF_PARSE_PATH);
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", async () => {
      const texts = [];
      try {
        const buf = Buffer.concat(chunks);
        await m(buf, {
          pagerender: (pd) => pd.getTextContent().then((tc) => {
            const t = tc.items.map((i) => i.str || "").join(" ").trim();
            texts.push(t);
            return t;
          }),
        });
        process.stdout.write(JSON.stringify({ ok: true, texts }));
      } catch (e) {
        process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
      }
    });
  `;

  return await new Promise<string[]>((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", workerScript], {
      env: { ...process.env, PDF_PARSE_PATH: pdfParsePath },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (c: Buffer) => (out += c.toString("utf-8")));
    const stderr: Buffer[] = [];
    child.stderr.on("data", (c: Buffer) => stderr.push(c));
    child.on("error", reject);
    child.on("close", () => {
      let payload: { ok: boolean; texts?: string[]; error?: string };
      try {
        payload = JSON.parse(out.trim());
      } catch {
        reject(new Error(`pdf-check worker 未返回有效结果: ${Buffer.concat(stderr).toString("utf-8").slice(0, 300)}`));
        return;
      }
      if (payload.ok && payload.texts) resolve(payload.texts);
      else reject(new Error(payload.error ?? "pdf-parse 解析失败"));
    });
    child.stdin.write(buffer);
    child.stdin.end();
  });
}

/**
 * Content-check an exported PDF buffer. Never throws for contract findings —
 * only infrastructure errors (unreadable buffer) surface as PDF-01 issues.
 */
export async function checkExportedPdf(buffer: Buffer, options: PdfCheckOptions = {}): Promise<PdfCheckResult> {
  const issues: ValidationIssue[] = [];
  const paperSizes = parseMediaBoxes(buffer);

  let pageCount = 0;
  let pageTexts: string[] = [];
  try {
    pageTexts = await extractPageTexts(buffer);
    pageCount = pageTexts.length;
  } catch (err) {
    issues.push({
      ruleId: "PDF-01",
      level: "MUST",
      message: `导出 PDF 无法解析（页文本提取失败）：${(err as Error).message}`,
      fix: "重跑 export-pdf；若稳定复现，检查 Puppeteer 版本与磁盘空间",
    });
    return { issues, pageCount: 0, paperSizes, pageTexts: [] };
  }

  // PDF-01: at least one page.
  if (pageCount < 1) {
    issues.push({
      ruleId: "PDF-01",
      level: "MUST",
      message: "导出 PDF 没有任何页面（页文本提取为空）",
      fix: "检查源 Markdown 是否为空，或渲染管线是否截断输出",
    });
  }

  // Slide expectation: explicit flag, companion deck, or 16:9 paper ratio.
  const slides =
    options.slides ??
    (options.deckMd !== undefined ||
      (paperSizes.length > 0 && isSixteenNine(paperSizes[0].w, paperSizes[0].h)));

  // PDF-02: paper size consistency (+ slide 16:9 requirement).
  if (paperSizes.length === 0) {
    issues.push({
      ruleId: "PDF-02",
      level: "MUST",
      message: "PDF 中找不到 /MediaBox，无法核对页面尺寸",
    });
  } else {
    if (paperSizes.length > 1) {
      issues.push({
        ruleId: "PDF-02",
        level: "MUST",
        message: `页面尺寸不一致：${paperSizes.map((s) => `${s.w.toFixed(0)}×${s.h.toFixed(0)}pt`).join(" / ")}`,
        fix: "slide 导出应整份一份纸型；检查渲染管线是否混用了多段 @page 规则",
      });
    } else if (slides && !isSixteenNine(paperSizes[0].w, paperSizes[0].h)) {
      issues.push({
        ruleId: "PDF-02",
        level: "MUST",
        message: `slide PDF 纸型应为 16:9（1440×810pt，即 1920×1080@96dpi = 20×11.25in），实际 ${paperSizes[0].w.toFixed(0)}×${paperSizes[0].h.toFixed(0)}pt`,
        fix: "幻灯片导出走 ColaMD 应用内的 slides-printing；文档式 export-pdf 不会产生 16:9 纸面",
      });
    }
  }

  // Deck-driven checks.
  let deckPages = 0;
  let deckTitle = "";
  if (options.deckMd) {
    const { countDeckPages, extractDeckChrome } = await import("./slides-markdown.js");
    deckPages = countDeckPages(options.deckMd);
    deckTitle = extractDeckChrome(options.deckMd).title;
  }

  // PDF-03: slide page count matches the deck markdown.
  if (slides && deckPages > 0 && pageCount !== deckPages) {
    issues.push({
      ruleId: "PDF-03",
      level: "MUST",
      message: `slide 页数与 deck 不一致：PDF ${pageCount} 页 ≠ deck ${deckPages} 页`,
      fix: "检查 deck 分页（--- 数量）与导出截断；常见于内容溢出把一页挤出两张纸",
    });
  }

  // PDF-04: blank pages.
  pageTexts.forEach((text, i) => {
    if (text.length < 5) {
      issues.push({
        ruleId: "PDF-04",
        level: "SHOULD",
        message: `第 ${i + 1} 页几乎无文本内容（疑似空白页，共 ${text.length} 字符）`,
        fix: "检查该页内容是否被版式 CSS 隐藏，或内容溢出后仅剩页首垫高",
      });
    }
  });

  // PDF-05: deck chrome fidelity. Chromium's text extraction can inject
  // spaces between glyph runs — compare with all whitespace stripped.
  if (slides && deckTitle && pageTexts.length > 0) {
    const bare = (s: string) => s.replace(/\s+/g, "");
    const title = bare(deckTitle);
    if (!pageTexts.some((t) => bare(t).includes(title))) {
      issues.push({
        ruleId: "PDF-05",
        level: "SHOULD",
        message: `deck 标题「${deckTitle}」未出现在任何 PDF 页面上（chrome 可能被主题隐藏或换底页被上游 !important 覆盖）`,
        fix: "核对主题的 .slide-chrome/.slide-foot 规则是否被 body.presenting 作用域正确覆盖导出域",
      });
    }
  }

  return { issues, pageCount, paperSizes, pageTexts };
}
