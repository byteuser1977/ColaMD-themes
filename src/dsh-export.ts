/**
 * 导出通道：把当前预览的 Markdown 落成真正的文件。
 *
 * - `pdf`：用自带渲染器生成独立文档，交给 puppeteer 打印（不依赖 `@bytechain.cn/colamd`）。
 * - `pptx`：逐页幻灯片转 PPTX（16:9），走零依赖 OOXML 构造器。
 * - `docx`：按块级 AST 转 WordprocessingML，保留标题层级 / 列表 / 表格 / 代码块 / 引用。
 */
import { parseBlocks, paginateDeck, splitDeck, renderSlidesDocument, renderThemePreviewDocument, plainInline } from "./dsh-preview.js";
import type { MdBlock, Slide } from "./dsh-preview.js";
import type { ThemeEntry } from "./dsh-theme-catalog.js";
import { buildDocx, buildPptx } from "./dsh-office.js";
import type { DocBlock, OfficeMeta } from "./dsh-office.js";

/** 支持的导出格式。 */
export type ExportFormat = "pdf" | "pptx" | "docx";

/** 预览模式：整篇文档 / 幻灯片。 */
export type ExportMode = "document" | "slides";

/** 导出结果：字节 + 建议文件名 + MIME。 */
export interface ExportedFile {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
}

const PDF_CONTENT_TYPE = "application/pdf";
const PPTX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** 文件名去噪：保留中英文、数字、空格与短横线，其余替换成短横线。 */
export function safeFilename(title: string, fallback = "colamd"): string {
  const trimmed = title.trim().replace(/\.md$/i, "");
  const cleaned = trimmed
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned === "" ? fallback : cleaned.slice(0, 80);
}

/** 主题令牌 → Office 元信息（字体与主色）。 */
function officeMeta(entry: ThemeEntry, title: string): OfficeMeta {
  return { accent: entry.tokens.accent, title };
}

/** 块级 AST → DOCX 块。 */
export function toDocBlocks(blocks: readonly MdBlock[]): DocBlock[] {
  const out: DocBlock[] = [];
  for (const block of blocks) {
    if (block.kind === "heading") out.push({ kind: "heading", level: block.level, text: plainInline(block.text) });
    else if (block.kind === "paragraph") out.push({ kind: "paragraph", text: plainInline(block.text) });
    else if (block.kind === "code") out.push({ kind: "code", text: block.text, lang: block.lang });
    else if (block.kind === "quote") out.push({ kind: "quote", text: plainInline(block.text) });
    else if (block.kind === "divider") out.push({ kind: "divider" });
    else if (block.kind === "table") {
      out.push({
        kind: "table",
        header: block.header.map(plainInline),
        rows: block.rows.map((row) => row.map(plainInline)),
      });
    } else if (block.kind === "list") {
      out.push({ kind: "list", ordered: block.ordered, items: block.items.map((item) => plainInline(item.text)) });
    }
  }
  return out;
}

/** 幻灯片 → PPTX 页内容（kicker + 标题 + 导语/段落 + 列表 + 首个代码块）。 */
export function toPptxSlides(slides: readonly Slide[]): { kicker?: string; title?: string; paragraphs?: string[]; bullets?: string[]; code?: string }[] {
  return slides.map((slide) => {
    const paragraphs: string[] = [];
    const bullets: string[] = [];
    let code: string | undefined;
    if (slide.lead !== "") paragraphs.push(plainInline(slide.lead));
    for (const block of slide.blocks) {
      if (block.kind === "paragraph") paragraphs.push(plainInline(block.text));
      else if (block.kind === "quote") paragraphs.push(plainInline(block.text));
      else if (block.kind === "heading") paragraphs.push(plainInline(block.text));
      else if (block.kind === "list") {
        for (const item of block.items) {
          const text = plainInline(item.text);
          bullets.push(item.depth > 0 ? `· ${text}` : text);
        }
      } else if (block.kind === "code" && code === undefined) code = block.text;
      else if (block.kind === "table") {
        for (const row of block.rows) bullets.push(row.map(plainInline).join(" · "));
      }
    }
    const page: { kicker?: string; title?: string; paragraphs?: string[]; bullets?: string[]; code?: string } = {};
    const kicker = slide.kicker !== "" ? slide.kicker : slide.label;
    if (kicker !== "") page.kicker = plainInline(kicker);
    if (slide.title !== "") page.title = plainInline(slide.title);
    if (paragraphs.length > 0) page.paragraphs = paragraphs;
    if (bullets.length > 0) page.bullets = bullets;
    if (code !== undefined) page.code = code;
    return page;
  });
}

/** 用 puppeteer 打印 PDF；调用方负责兜底错误（未安装 Chromium 时会抛）。 */
async function printPdf(html: string, options: { format?: string; width?: string; height?: string }): Promise<Uint8Array> {
  const puppeteerModule = (await import("puppeteer")) as unknown as {
    default?: { launch: (options?: Record<string, unknown>) => Promise<PuppeteerBrowser> };
    launch?: (options?: Record<string, unknown>) => Promise<PuppeteerBrowser>;
  };
  const launcher = puppeteerModule.default ?? puppeteerModule;
  if (typeof launcher.launch !== "function") throw new Error("puppeteer 不可用");
  const browser = await launcher.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    // 放映/打印的纸面是 1920×1080（20in×11.25in@96dpi）；不先把视口对齐，
    // 量出来的溢出和真实分页对不上，缩放就会漏算。
    if (typeof page.setViewport === "function") {
      await page.setViewport({ width: 1920, height: 1080 });
    }
    await page.setContent(html, { waitUntil: "load" });
    // 打印媒体下的盒模型与屏幕略有差异（容器查询单位、分页），切过去再量一次，
    // 否则幻灯片会带着屏幕量出的缩放值被印到纸上。
    if (typeof page.emulateMediaType === "function") await page.emulateMediaType("print");
    if (typeof page.evaluate === "function") {
      await page.evaluate(() => document.fonts && document.fonts.ready ? document.fonts.ready.then(() => undefined) : undefined);
      // 逐页把字号按「纸面高度 / 内容高度」收敛（改字号会重排，打印时才量得准）；
      // 不用 zoom（会改动 container-type: size 纸面的 cqw/cqh），也不用 transform
      // （打印里只影响绘制、压不住溢出）。
      await page.evaluate(() => {
        const papers = Array.from(document.querySelectorAll<HTMLElement>(".cm-page"));
        for (const paper of papers) {
          const content = paper.querySelector<HTMLElement>(".cm-content");
          if (!content) continue;
          content.style.fontSize = "";
          const base = parseFloat(getComputedStyle(content).fontSize) || 0;
          if (!base) continue;
          const floor = base * 0.5;
          for (let i = 0; i < 8; i += 1) {
            const room = paper.clientHeight;
            const need = content.scrollHeight;
            if (!room || need <= room + 1) break;
            const current = parseFloat(getComputedStyle(content).fontSize) || base;
            const next = current * (room / need) * 0.98;
            if (next < floor) {
              content.style.fontSize = `${floor.toFixed(2)}px`;
              break;
            }
            content.style.fontSize = `${next.toFixed(2)}px`;
          }
        }
      });      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    const buffer = await page.pdf({
      format: options.format,
      width: options.width,
      height: options.height,
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      preferCSSPageSize: true,
    } as Record<string, unknown>);
    return new Uint8Array(buffer);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

interface PuppeteerBrowser {
  newPage: () => Promise<{
    setContent: (html: string, options?: Record<string, unknown>) => Promise<void>;
    setViewport?: (viewport: { width: number; height: number }) => Promise<void>;
    pdf: (options: Record<string, unknown>) => Promise<Uint8Array | Buffer>;
    evaluate?: (fn: () => unknown) => Promise<unknown>;
    emulateMediaType?: (type: string) => Promise<void>;
  }>;
  close: () => Promise<void>;
}

/** 导出单个文件。`theme` 决定配色与字体，`mode` 决定版式。 */
export async function exportDocument(input: {
  format: ExportFormat;
  mode: ExportMode;
  markdown: string;
  theme: ThemeEntry;
  css: string;
  title: string;
}): Promise<ExportedFile> {
  const { format, mode, markdown, theme, css, title } = input;
  const base = safeFilename(title, theme.id);

  if (format === "docx") {
    const blocks = toDocBlocks(parseBlocks(markdown));
    const bytes = buildDocx({ blocks, meta: officeMeta(theme, title) });
    return { bytes, filename: `${base}.docx`, contentType: DOCX_CONTENT_TYPE };
  }

  if (format === "pptx") {
    // 文稿模式在路由层已被拒绝（400 bad-format），这里统一按幻灯片分页。
    const slides = paginateDeck(splitDeck(markdown, title));
    const bytes = buildPptx({ slides: toPptxSlides(slides), meta: officeMeta(theme, title) });
    return { bytes, filename: `${base}.pptx`, contentType: PPTX_CONTENT_TYPE };
  }

  if (mode === "slides") {
    const html = renderSlidesDocument(theme, css, markdown, { title, print: true });
    const bytes = await printPdf(html, { width: "1280px", height: "720px" });
    return { bytes, filename: `${base}.slides.pdf`, contentType: PDF_CONTENT_TYPE };
  }

  const html = renderThemePreviewDocument(theme, css, markdown, { title, print: true });
  const bytes = await printPdf(html, { format: "A4" });
  return { bytes, filename: `${base}.pdf`, contentType: PDF_CONTENT_TYPE };
}
