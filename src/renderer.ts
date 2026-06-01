/**
 * Puppeteer-based rendering engine for ColaMD HTML/PDF export.
 *
 * Uses @bytechain.cn/colamd/renderer to create a headless Milkdown editor,
 * apply themes, render mermaid/math, and export standalone HTML or PDF.
 *
 * Architecture:
 *   Local HTTP server (serves renderer.js + page HTML)
 *     → Puppeteer page (same-origin, no CORS)
 *       → createColaMDEditor()
 *       → applyTheme() + setMarkdown() + ensureAllPluginsRendered()
 *       → buildExportHTML() / page.pdf()
 */

import puppeteer, { type Browser, type Page } from "puppeteer";
import { createServer, type Server } from "node:http";
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { resolve, dirname } from "node:path";

// ── Types ──

/** Input for rendering a markdown document. */
export interface RenderInput {
  /** Markdown content string */
  markdown: string;
  /** Theme name: built-in (light/dark/elegant/newsprint) or "custom:<name>" */
  themeName?: string;
  /** Custom CSS content (used with "custom:<name>" themes) */
  customCSS?: string;
  /** Document title for the HTML <title> */
  title?: string;
}

/** Result of a render operation. */
export interface RenderResult {
  /** Complete standalone HTML document */
  html: string;
}

/** PDF export options. */
export interface PDFExportOptions {
  /** Page format */
  format?: "A4" | "Letter" | "A3";
  /** Print background colors/images */
  printBackground?: boolean;
  /** Page margins */
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
}

// ── File resolution ──

/** Locate the ColaMD renderer ESM bundle in node_modules. */
function findRendererPath(): string {
  const candidates = [
    resolve(dirname(new URL(import.meta.url).pathname), "../node_modules/@bytechain.cn/colamd/dist/lib/colamd-renderer.js"),
    resolve(process.cwd(), "node_modules/@bytechain.cn/colamd/dist/lib/colamd-renderer.js"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "Cannot find @bytechain.cn/colamd renderer. " +
    "Install it: npm install @bytechain.cn/colamd"
  );
}

// ── Local HTTP server ──

const SHELL_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>body{margin:0;padding:0}#editor{width:100%;min-height:100vh}</style>
</head><body><div id="editor"></div></body></html>`;

interface LocalServer {
  port: number;
  close(): Promise<void>;
}

function startLocalServer(rendererPath: string): Promise<LocalServer> {
  return new Promise((resolveStart, reject) => {
    const server: Server = createServer((req, res) => {
      if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(SHELL_HTML);
      } else if (req.url === "/colamd-renderer.js") {
        res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
        createReadStream(rendererPath).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolveStart({
        port,
        close: () =>
          new Promise((resolveClose) => server.close(() => resolveClose())),
      });
    });

    server.on("error", reject);
  });
}

// ── Renderer ──

export class ColamdRenderer {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private server: LocalServer | null = null;
  private ready = false;

  /** Launch Puppeteer and prepare the editor page. */
  async init(): Promise<void> {
    if (this.browser) return;

    // Start local HTTP server for the renderer bundle
    const rendererPath = findRendererPath();
    this.server = await startLocalServer(rendererPath);
    const origin = `http://127.0.0.1:${this.server.port}`;

    // Launch Puppeteer
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    this.page = await this.browser.newPage();

    // Navigate to shell page (same origin as renderer script)
    await this.page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });

    // Load the ColaMD renderer as ESM (same-origin, no CORS)
    await this.page.addScriptTag({
      type: "module",
      content: `
        import { createColaMDEditor } from '${origin}/colamd-renderer.js';
        window.__colamdReady = createColaMDEditor({
          rootId: 'editor',
          editable: false
        }).then(handle => {
          window.__colamdHandle = handle;
          return true;
        }).catch(err => {
          window.__colamdError = err.message;
          return false;
        });
      `,
    });

    // Wait for the editor to initialize
    await this.page.waitForFunction(
      () => (window as any).__colamdHandle || (window as any).__colamdError,
      { timeout: 30000 }
    );

    const error = await this.page.evaluate(() => (window as any).__colamdError);
    if (error) throw new Error(`Editor init failed: ${error}`);

    this.ready = true;
  }

  /**
   * Render markdown to a standalone HTML document.
   */
  async render(input: RenderInput): Promise<RenderResult> {
    if (!this.ready || !this.page) await this.init();
    const page = this.page!;

    // Apply theme
    if (input.themeName) {
      await page.evaluate(
        (name: string, css: string | undefined) => {
          (window as any).__colamdHandle.applyTheme(name, css || undefined);
        },
        input.themeName,
        input.customCSS
      );
    }

    // Set markdown content
    await page.evaluate((md: string) => {
      (window as any).__colamdHandle.setMarkdown(md);
    }, input.markdown);

    // Wait for all plugins (mermaid, math) to finish rendering
    await page.evaluate(async () => {
      await (window as any).__colamdHandle.ensureAllPluginsRendered();
    });

    // Additional settle time for complex diagrams
    await new Promise((r) => setTimeout(r, 500));

    // Build export HTML
    const html = await page.evaluate(() => {
      return (window as any).__colamdHandle.buildExportHTML();
    });

    // Inject custom title if provided
    const finalHtml = input.title
      ? html.replace(/<title>[^<]*<\/title>/, `<title>${input.title}</title>`)
      : html;

    return { html: finalHtml };
  }

  /**
   * Render markdown and export as PDF.
   */
  async exportPDF(input: RenderInput, options: PDFExportOptions = {}): Promise<Buffer> {
    if (!this.ready || !this.page) await this.init();

    // First render to HTML
    const { html } = await this.render(input);

    // Load the HTML in a fresh page for PDF generation
    const pdfPage = await this.browser!.newPage();
    await pdfPage.setContent(html, { waitUntil: "load", timeout: 30000 });

    // NOTE: Do NOT use emulateMediaType("screen") here.
    // The CSS template includes comprehensive @media print rules (SECTION 6)
    // with !important declarations and print-color-adjust: exact for proper styling.
    // Using screen mode would prevent these print-specific styles from applying.

    const pdfBuffer = await pdfPage.pdf({
      format: options.format ?? "A4",
      printBackground: options.printBackground ?? true,
      margin: options.margin ?? { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });

    await pdfPage.close();
    return Buffer.from(pdfBuffer);
  }

  /** Shut down the browser and local server with proper resource cleanup. */
  async close(): Promise<void> {
    try {
      // Explicitly close page first to prevent zombie processes
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } finally {
      this.ready = false;

      if (this.server) {
        await this.server.close();
        this.server = null;
      }
    }
  }
}

/**
 * One-shot render: init → render → close.
 * Convenience for single-file export.
 */
export async function renderMarkdown(input: RenderInput): Promise<RenderResult> {
  const renderer = new ColamdRenderer();
  try {
    return await renderer.render(input);
  } finally {
    await renderer.close();
  }
}

/**
 * One-shot PDF export: init → render PDF → close.
 */
export async function renderPDF(
  input: RenderInput,
  options?: PDFExportOptions
): Promise<Buffer> {
  const renderer = new ColamdRenderer();
  try {
    return await renderer.exportPDF(input, options);
  } finally {
    await renderer.close();
  }
}
