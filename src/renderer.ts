/**
 * Puppeteer-based rendering engine for ColaMD HTML/PDF export.
 *
 * Uses the @bytechain.cn/colamd 2.x library build (dist/lib/colamd-renderer.js +
 * colamd.css, requires ≥2.7.8-rc.2) to create a headless editor, apply themes,
 * render mermaid/math, and export standalone HTML or PDF. Theme CSS targets the
 * ColaMD 2.7.13 contract (machine-readable as themes/contract.json in the
 * npm package) and is consumed directly as `:root` declarations.
 *
 * Architecture:
 *   Local HTTP server (serves renderer.js + page HTML)
 *     → Puppeteer page (same-origin, no CORS)
 *       → createColaMDEditor()
 *       → applyTheme() + setMarkdown() + ensureAllPluginsRendered()
 *       → buildExportHTML({ title }) / page.pdf()
 */

import puppeteer, { type Browser, type Page } from "puppeteer";
import { createServer, type Server } from "node:http";
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatColamdCompat, getColamdCompat, MIN_RENDERER_VERSION, REQUIRED_RENDERER_API, REQUIRED_SLIDES_API, SLIDES_EXPORT_MIN_VERSION, SUPPORTED_CONTRACT } from "./compat.js";

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
  /**
   * Trim exported-artifact bloat to save tokens when an AI agent reads the
   * output back. When `true` (default), any `@font-face` blocks that embed
   * base64 math fonts (KaTeX) are stripped from the exported HTML unless the
   * source markdown actually contains a math expression. Without math, losing
   * the inlined fonts only costs a fallback to the system font while shrinking
   * a typical export from ~1.5 MB to ~57 KB. Pass `optimize: false` to always
   * keep the full inlined-font artifact (e.g. for formula-heavy documents whose
   * math must render remotely after export).
   */
  optimize?: boolean;
  /**
   * Render as a slide deck: keep `--slide-*` theme tokens and, for
   * `exportSlidesPDF()`, lay the editor out on 16:9 sheets. Ignored by the
   * document `render()` / `exportPDF()` paths.
   */
  slides?: boolean;
}

/** Result of a render operation. */
export interface RenderResult {
  /** Complete standalone HTML document */
  html: string;
}

// ── Export-artifact size optimization ──

/**
 * Heuristic: does the source markdown contain inline/block math that relies on
 * the inlined KaTeX fonts? Only unambiguous math markers count so ordinary
 * prose is not penalized: `$$..$$` or a *balanced* pair of `$` for inline math,
 * `\(..\)` / `\[..\]`, and latex `\begin{..}` environments. A lone `$` used for
 * money/units (e.g. `$1.5M`) is deliberately ignored.
 */
function markdownHasMath(markdown: string): boolean {
  // Latex environments and explicit macros.
  if (/\\begin\{[A-Za-z]+\}/.test(markdown)) return true;
  // Display math `$$...$$` (unescaped).
  if (/(^|[^\\])\$\$/.test(markdown)) return true;
  // Escaped inline math `\(...\)` or `\[...\]`.
  if (/\\[\(\[]/.test(markdown)) return true;
  // Balanced inline `$...$`: an even count of unescaped `$` is a strong signal
  // (open+close). Price mentions like `$12`/`$1.5M` stay odd and are excluded.
  const matches = markdown.match(/(^|[^\\])\$/g) ?? [];
  return matches.length >= 2 && matches.length % 2 === 0;
}

/**
 * Strip `@font-face{...}` blocks (all of them are KaTeX math fonts in the
 * bundled colamd.css) from an exported HTML document. Keeps every non-font
 * style rule and the document structure intact. Only the inlined base64 font
 * payloads are removed, replacing each block with nothing so the browser falls
 * back to the platform default font family.
 */
function stripMathFonts(html: string): string {
  return html.replace(/@font-face\s*\{[^}]*\}\s*/g, "");
}

/**
 * Strip `--slide-*` declarations from custom theme CSS before handing it to
 * the export pipeline. The export artifact is a semantic `.colamd-document`
 * (no cm-md-page/slide classes), so slide tokens are inert there — but the
 * platform's style collector (≤2.7.12) serializes the injected `:root` rule
 * verbatim and would leak them into every export. Line-based removal matches
 * the generator's one-token-per-line emission.
 */
function stripSlideTokenDeclarations(css: string): string {
  if (!css.includes("--slide-")) return css;
  return css
    .split("\n")
    .filter((line) => !/^\s*--slide-[\w-]+\s*:/.test(line))
    .join("\n");
}

/**
 * Build the final export artifact: apply the token-saving optimization when
 * requested (default on) and the source has no math that needs remote fonts.
 */
function optimizeExportHtml(html: string, markdown: string, optimize: boolean): string {
  if (optimize && !markdownHasMath(markdown)) {
    return stripMathFonts(html);
  }
  return html;
}

/** 16:9 sheet height in CSS px (7.5in × 96dpi). */
const SLIDE_SHEET_PX = 720;
/** Body font size the platform's slides print layout assigns to .cm-content. */
const SLIDE_PRINT_FONT_PX = 24;
/** Leave a hair of room: a page that exactly fills the sheet tends to spill. */
const SLIDE_SAFETY_PX = 8;
/** Readability floor — below this the deck is better re-authored than shrunk. */
const SLIDE_MIN_SCALE = 0.6;
const SLIDE_FIT_STYLE_ID = "colamd-slides-fit";

/**
 * Measure the tallest page on the sheet, in CSS px. Hero pages carry a
 * `::before` centering spacer, so the value includes that padding; content
 * pages (the ones that actually overflow) do not have one.
 */
const MEASURE_SLIDES_JS = `(() => {
  const root = document.querySelector("#editor .cm-content");
  if (!root) return 0;
  const lines = Array.from(root.children);
  const starts = Array.from(root.querySelectorAll(".cm-md-page-start"));
  let max = 0;
  for (const start of starts) {
    const m = /(?:^|\\s)cm-md-page-(\\d+)(?:\\s|$)/.exec(start.className);
    if (!m) continue;
    const re = new RegExp("(?:^|\\\\s)cm-md-page-" + m[1] + "(?:\\\\s|$)");
    const owned = lines.filter(function (el) {
      return re.test(el.className) && !el.classList.contains("cm-md-hr");
    });
    if (owned.length === 0) continue;
    const first = owned[0];
    const last = owned[owned.length - 1];
    const used = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
    if (used > max) max = used;
  }
  return max;
})()`;

/**
 * The platform prints slides at a fixed 24px body size on a 1280×720 sheet.
 * Dense pages (6-card grids, long timelines) are taller than one sheet at
 * that size and would spill into a second page — the exact failure PDF-03
 * reports. Shrink the sheet type just enough for every page to fit, with a
 * few measure→scale passes (em-based layout scales, fixed padding doesn't).
 */
async function fitSlidesToSheet(page: Page): Promise<void> {
  // The platform owns the print base size; read it instead of assuming 24px.
  const baseFont = (await page.evaluate(`(() => {
    const root = document.querySelector("#editor .cm-content");
    return root ? parseFloat(getComputedStyle(root).fontSize) || ${SLIDE_PRINT_FONT_PX} : ${SLIDE_PRINT_FONT_PX};
  })()`)) as number;
  let scale = 1;
  for (let attempt = 0; attempt < 3; attempt++) {
    const maxUsed = (await page.evaluate(MEASURE_SLIDES_JS)) as number;
    if (!Number.isFinite(maxUsed) || maxUsed <= SLIDE_SHEET_PX - SLIDE_SAFETY_PX) return;
    const target = scale * ((SLIDE_SHEET_PX - SLIDE_SAFETY_PX) / maxUsed);
    if (target >= scale - 0.001) return;
    scale = Math.max(SLIDE_MIN_SCALE, target);
    const fontPx = Math.round(baseFont * scale * 10) / 10;
    await page.evaluate(
      (css: string, id: string) => {
        let style = document.getElementById(id) as HTMLStyleElement | null;
        if (!style) {
          style = document.createElement("style");
          style.id = id;
          document.head.appendChild(style);
        }
        style.textContent = css;
      },
      `body.slides-printing #editor .cm-content{font-size:${fontPx}px !important}`,
      SLIDE_FIT_STYLE_ID
    );
    if (scale <= SLIDE_MIN_SCALE) return;
  }
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
  const moduleDir = fileURLToPath(new URL("../node_modules/@bytechain.cn/colamd/dist/lib", import.meta.url));
  const candidates = [
    resolve(moduleDir, "colamd-renderer.js"),
    resolve(process.cwd(), "node_modules/@bytechain.cn/colamd/dist/lib/colamd-renderer.js"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // Detect a 2.x distribution without the library entry (e.g. the 2.7.7 app
  // package, or a desktop-only build): give an actionable error.
  for (const base of candidates.map((p) => resolve(p, "../../.."))) {
    const pkgJson = join(base, "package.json");
    if (existsSync(pkgJson)) {
      try {
        const version = JSON.parse(readFileSync(pkgJson, "utf-8")).version as string;
        if (version.startsWith("2.")) {
          throw new Error(
            `@bytechain.cn/colamd ${version} 不含 colamd-renderer.js 库入口（2.7.8 起恢复提供）。` +
            `请升级: npm install @bytechain.cn/colamd@^${MIN_RENDERER_VERSION}`
          );
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("库入口")) throw e;
      }
    }
  }
  throw new Error(
    "Cannot find @bytechain.cn/colamd renderer. " +
    `Install it: npm install @bytechain.cn/colamd@^${MIN_RENDERER_VERSION}`
  );
}

// ── Local HTTP server ──

const SHELL_HTML = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link rel="stylesheet" href="/colamd.css">
<style>html,body{margin:0;padding:0}
#editor-region{width:100%;height:100vh}
#editor{width:100%;min-height:100vh}</style>
</head><body><div id="editor-region"><div id="editor"></div></div></body></html>`;

interface LocalServer {
  port: number;
  close(): Promise<void>;
}

function startLocalServer(rendererPath: string): Promise<LocalServer> {
  const cssPath = join(dirname(rendererPath), "colamd.css");
  return new Promise((resolveStart, reject) => {
    const server: Server = createServer((req, res) => {
      if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(SHELL_HTML);
      } else if (req.url === "/colamd-renderer.js") {
        res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
        createReadStream(rendererPath).pipe(res);
      } else if (req.url === "/colamd.css") {
        res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
        createReadStream(cssPath).pipe(res);
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

    // Launch Puppeteer (use "shell" mode — chrome-headless-shell binary is more
    // stable on this Windows environment than the full Chrome --headless=new mode)
    this.browser = await puppeteer.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    this.page = await this.browser.newPage();
    // Match the 16:9 sheet (1280×720 CSS px = 13.3333×7.5in @96dpi) so the
    // slide print layout measures the same widths it prints at. With the
    // default 800×600 viewport the cover title wraps to 3 lines and every
    // card page overflows into extra sheets.
    await this.page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

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

    // Capability probe: verify the editor handle exposes the API surface the
    // export pipeline calls, so future platform API drift produces an
    // actionable error (with the installed version) instead of an
    // "undefined is not a function" mid-render.
    const missingApi = await this.page.evaluate(
      (methods: string[]) => {
        const handle = (window as any).__colamdHandle;
        if (!handle || typeof handle !== "object") return methods;
        return methods.filter((m) => typeof handle[m] !== "function");
      },
      [...REQUIRED_RENDERER_API]
    );
    if (missingApi.length > 0) {
      const { version } = getColamdCompat();
      throw new Error(
        `Renderer API 不兼容：@bytechain.cn/colamd ${version ?? "(未知版本)"} 缺少导出管线所需的方法 ` +
        `[${missingApi.join(", ")}]。平台可能已升级 API，` +
        `请安装经核验的版本: npm install @bytechain.cn/colamd@^${SUPPORTED_CONTRACT}`
      );
    }

    // Contract drift warning — non-fatal: the platform still renders, but our
    // :root variables may no longer be fully consumed.
    const compat = getColamdCompat();
    if (compat.status === "drift") {
      console.warn(`[colamd-themes] 平台契约漂移: ${formatColamdCompat(compat)}`);
      console.warn(`[colamd-themes] 导出仍将继续；如配色异常请核对平台 changelog 或安装 @bytechain.cn/colamd@^${SUPPORTED_CONTRACT}`);
    }

    this.ready = true;
  }

  /**
   * Apply theme, load markdown and wait for async plugins.
   * Shared by the document and slide export paths.
   */
  private async prepare(input: RenderInput, options: { keepSlideTokens?: boolean } = {}): Promise<Page> {
    if (!this.ready || !this.page) await this.init();
    const page = this.page!;

    // Apply theme — the 2.x renderer consumes :root contract CSS directly.
    // Document export strips slide tokens: the semantic export DOM can't
    // consume them and the platform collector would leak them. Slide export
    // keeps them so --slide-* styling actually applies to the deck.
    if (input.themeName) {
      const css = options.keepSlideTokens
        ? input.customCSS
        : stripSlideTokenDeclarations(input.customCSS || "");
      await page.evaluate(
        (name: string, customCSS: string | undefined) => {
          (window as any).__colamdHandle.applyTheme(name, customCSS || undefined);
        },
        input.themeName,
        css
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
    return page;
  }

  /**
   * Render markdown to a standalone HTML document.
   */
  async render(input: RenderInput): Promise<RenderResult> {
    const page = await this.prepare(input);

    // Build export HTML (2.x API: title goes through the options object)
    const html = await page.evaluate((title: string | undefined) => {
      return (window as any).__colamdHandle.buildExportHTML({ title });
    }, input.title);

    // The platform's print stylesheet hides `body > :not(#editor-region)` (it
    // targets the live app shell). Our standalone export puts the document in
    // `<article class="colamd-document">` directly under <body>, so give it an
    // id and override with matching specificity — without it the exported HTML
    // and PDF print blank.
    const printableHtml = html
      .replace(
        /<article\s+class="([^"]*colamd-document[^"]*)"/,
        '<article id="colamd-export-document" class="$1"'
      )
      .replace(
        "</head>",
        '<style>@media print { body > #colamd-export-document { display: block !important; } }</style></head>'
      );

    // Token-saving optimization: for documents without math, drop the inlined
    // base64 KaTeX fonts so agent-side reads of the artifact no longer drag
    // ~1.5 MB (~400k tokens) of unused font data into the model context.
    // Opt out with `optimize: false` when the full-font artifact is required.
    const optimizedHtml = optimizeExportHtml(printableHtml, input.markdown, input.optimize ?? true);

    return { html: optimizedHtml };
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

  /**
   * Render a slide deck markdown and export it as a 16:9 PDF.
   *
   * Unlike `exportPDF()` this does NOT go through the semantic export HTML —
   * it prints the live editor surface laid out as sheets by the platform's
   * slides print layout, so per-page chrome, hero centering and page breaks
   * come from the same code the app uses for File → Export Slides PDF.
   *
   * Requires a platform whose lib entry exposes the slides export API
   * (`enterSlidesPrintLayout` / `exitSlidesPrintLayout`).
   */
  async exportSlidesPDF(input: RenderInput): Promise<Buffer> {
    const page = await this.prepare(input, { keepSlideTokens: true });

    const missingApi = await page.evaluate(
      (methods: string[]) => {
        const handle = (window as any).__colamdHandle;
        if (!handle || typeof handle !== "object") return methods;
        return methods.filter((m) => typeof handle[m] !== "function");
      },
      [...REQUIRED_SLIDES_API]
    );
    if (missingApi.length > 0) {
      const { version } = getColamdCompat();
      throw new Error(
        `幻灯片导出 API 不兼容：@bytechain.cn/colamd ${version ?? "(未知版本)"} 缺少 ` +
        `[${missingApi.join(", ")}]。请安装 @bytechain.cn/colamd@^${SLIDES_EXPORT_MIN_VERSION}`
      );
    }

    const sheet = await page.evaluate(() => (window as any).__colamdHandle.enterSlidesPrintLayout());
    if (!sheet) {
      throw new Error(
        "这份文档没有幻灯片分页（`---`），无法按 deck 导出。先用 to-slides 生成 deck，或检查分页是否符合契约"
      );
    }

    try {
      await fitSlidesToSheet(page);
      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page
        .evaluate(() => (window as any).__colamdHandle.exitSlidesPrintLayout())
        .catch(() => {});
    }
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

/**
 * One-shot slide-deck PDF export: init → 16:9 sheets → PDF → close.
 */
export async function renderSlidesPDF(input: RenderInput): Promise<Buffer> {
  const renderer = new ColamdRenderer();
  try {
    return await renderer.exportSlidesPDF({ ...input, slides: true });
  } finally {
    await renderer.close();
  }
}
