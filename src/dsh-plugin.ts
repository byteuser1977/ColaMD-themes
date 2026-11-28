/**
 * DSH (DeepSeek Harness) 宿主入口 —— 本包以 dsh-market 插件 bundle 的形式加载
 * （cordis.patch.yml → dsh.bundle.patch）。
 *
 * 这里做两件事：
 * 1. 把随包分发的 agent skill（`skills/colamd-themes/SKILL.md`）注册进 Harness
 *    的 `skills` 服务，沿用与 dsh-ppt 相同的 provider 协议；
 * 2. 通过 `webServer` 暴露三条同源只读/单字段写接口，供客户端插件（
 *    `client/client.js`）在输入框旁选择主题、在右侧边栏预览主题：
 *
 *      GET  /api/bytechain/colamd-themes/catalog    主题清单 + 当前选择
 *      GET  /api/bytechain/colamd-themes/preview    单主题的独立预览 HTML
 *      GET  /api/bytechain/colamd-themes/selection  读取当前选择
 *      POST /api/bytechain/colamd-themes/selection  写入当前选择
 *
 * 预览 HTML 自带小型 Markdown 渲染器，不依赖 ColaMD 平台渲染器（那个包只是
 * 开发依赖，安装到 DSH 后并不存在），因此「装好即可预览」。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";

import { loadThemeCatalog, themesDirFrom, type ThemeEntry } from "./dsh-theme-catalog.js";
import {
  renderPresentDocument,
  renderSlidesDocument,
  renderSlidesFragment,
  renderThemeFragment,
  renderThemePreviewDocument,
} from "./dsh-preview.js";
import { exportDocument } from "./dsh-export.js";

// Ambient shape of the host-provided skill service lives in
// src/types/dsh-skill.d.ts — the package is never installed at build time.

/** Cordis plugin identity. */
const name = "colamd-themes";

/** Required host services. */
const inject = ["skills", "webServer"];

const PROVIDER = "colamd-themes-bundled";
const SKILL_NAME = "colamd-themes";
const DESCRIPTION =
  "Generate, validate, export, and manage ColaMD 2.8.0 contract CSS themes. " +
  "Extract themes from URLs/DOCX/PDF; export Markdown to standalone HTML/PDF.";

/** 客户端与宿主约定的接口前缀。 */
const ROUTE_BASE = "/api/bytechain/colamd-themes";
/** 选择结果落盘位置：与 CLI 的 ~/.colamd-themes/config.json 并列，互不覆盖。 */
const UI_STATE_FILE = path.join(homedir(), ".colamd-themes", "dsh-ui.json");
/** 预览 HTML 的进程内缓存时长。 */
const PREVIEW_CACHE_MS = 20_000;
/** 文档渲染接口的请求体上限（Markdown 全文，默认 4 MiB）。 */
const RENDER_BODY_LIMIT = 4 * 1024 * 1024;
/** 全屏演示内容的存活时长与同时保留份数。 */
const PRESENT_TTL_MS = 10 * 60 * 1000;
const PRESENT_MAX_ENTRIES = 24;
/** 全屏演示的进程内暂存：token → 已渲染好的 HTML。 */
const presentStore = new Map<string, { html: string; at: number }>();

interface SkillCandidate {
  name: string;
  description: string;
  invocation: { modelInvocable: boolean; userInvocable: boolean };
  provider: string;
  source: string;
  rank: number;
  locator: string;
}

interface SkillProvider {
  name: string;
  list(): Promise<SkillCandidate[]>;
  get(selected: { name: string }): Promise<(SkillCandidate & { content: string }) | undefined>;
}

interface WebServerService {
  register(options: {
    kind?: "exact" | "prefix";
    path: string;
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;
  }): () => void;
}

interface DshPluginContext {
  skills: {
    registerProvider(factory: () => SkillProvider): void;
  };
  webServer: WebServerService;
  logger?: { warn?(message: string): void };
}

/** Resolve the bundled skill rank; fall back when the host module differs. */
async function bundledSkillRank(): Promise<number> {
  try {
    const mod = (await import("@deepseek-ai/dsh-skill")) as { BUNDLED_SKILL_RANK?: number };
    return mod.BUNDLED_SKILL_RANK ?? 100;
  } catch {
    return 100;
  }
}

/** Register the bundled ColaMD Themes skill with the Harness skill service. */
function registerSkill(ctx: DshPluginContext, skillRoot: string, rank: number): void {
  const skillPath = path.join(path.resolve(skillRoot), "SKILL.md");
  const content = async () => (await readFile(skillPath, "utf8")).trimEnd();
  const candidate: SkillCandidate = {
    name: SKILL_NAME,
    description: DESCRIPTION,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER,
    source: "bundled",
    rank,
    locator: skillPath,
  };
  const provider: SkillProvider = {
    name: PROVIDER,
    async list() {
      return content().then(() => [candidate]).catch(() => []);
    },
    async get(selected) {
      if (selected.name !== SKILL_NAME) return undefined;
      try {
        return { ...candidate, content: await content() };
      } catch {
        return undefined;
      }
    },
  };
  ctx.skills.registerProvider(() => provider);
}

/* ─────────────────────────── HTTP 小工具 ─────────────────────────── */

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

function sendText(response: ServerResponse, status: number, contentType: string, body: string): void {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

/** 回写 HTML 文档（全屏演示窗口用）。 */
function sendHtml(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    // 演示页可能被窗口内联加载，禁止被外层帧限制挡住。
    "x-frame-options": "SAMEORIGIN",
  });
  response.end(body);
}

/** 回写二进制文件：文件名按 RFC 5987 编码，兼顾中文标题。 */
function sendBytes(response: ServerResponse, status: number, contentType: string, body: Buffer, filename: string): void {
  const asciiFallback = filename.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_");
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "content-length": body.length,
    "content-disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  response.end(body);
}

/** 读取 JSON 请求体；超过字节上限或解析失败返回 undefined。 */
async function readJsonBody(request: IncomingMessage, limit = 16 * 1024): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buf.length;
    if (size > limit) return undefined;
    chunks.push(buf);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    return undefined;
  }
}

/** 只接受本机同源请求：跨站页面拿不到 sec-fetch-site 的同源标记。 */
function isSameOrigin(request: IncomingMessage): boolean {
  const site = request.headers["sec-fetch-site"];
  if (typeof site === "string" && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.origin;
  if (typeof origin !== "string" || origin === "") return true;
  const host = request.headers.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/* ─────────────────────────── 选择状态 ─────────────────────────── */

interface UiState {
  theme?: string;
}

async function readUiState(): Promise<UiState> {
  try {
    const raw = await readFile(UI_STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && typeof (parsed as UiState).theme === "string") {
      return { theme: (parsed as UiState).theme };
    }
    return {};
  } catch {
    return {};
  }
}

async function writeUiState(state: UiState): Promise<void> {
  await mkdir(path.dirname(UI_STATE_FILE), { recursive: true });
  await writeFile(UI_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/** 当前选择：无效或缺失时回落到 elegant，再回落到目录首项。 */
function resolveSelection(entries: ThemeEntry[], stored: UiState): string {
  const ids = new Set(entries.map((entry) => entry.id));
  if (stored.theme !== undefined && ids.has(stored.theme)) return stored.theme;
  if (ids.has("elegant")) return "elegant";
  return entries[0]?.id ?? "";
}

/* ─────────────────────────── 路由实现 ─────────────────────────── */

interface PreviewCacheEntry {
  at: number;
  html: string;
  mtimeMs: number;
}

function createRoutes(ctx: DshPluginContext): (() => void)[] {
  const themesDir = themesDirFrom(import.meta.url);
  const previewCache = new Map<string, PreviewCacheEntry>();

  /** 取主题样式表全文；id 先过目录白名单，避免路径穿越。 */
  const readThemeCss = async (entries: ThemeEntry[], id: string): Promise<string | undefined> => {
    const found = entries.find((entry) => entry.id === id);
    if (found === undefined) return undefined;
    try {
      return await readFile(path.join(themesDir, found.file), "utf8");
    } catch {
      return undefined;
    }
  };

  const catalogHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" });
      response.end();
      return;
    }
    const entries = await loadThemeCatalog(themesDir);
    const stored = await readUiState();
    sendJson(response, 200, {
      ok: true,
      root: themesDir,
      selected: resolveSelection(entries, stored),
      themes: entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        subtitle: entry.subtitle,
        description: entry.description,
        tone: entry.tone,
        accent: entry.accent,
        tokens: entry.tokens,
        size: entry.size,
      })),
    });
  };

  const previewHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" });
      response.end();
      return;
    }
    let url: URL;
    try {
      url = new URL(request.url ?? "/", "http://localhost");
    } catch {
      sendJson(response, 400, { ok: false, error: "bad-url" });
      return;
    }
    const id = url.searchParams.get("theme") ?? "";
    if (!/^[A-Za-z0-9._-]+$/.test(id)) {
      sendJson(response, 400, { ok: false, error: "bad-theme" });
      return;
    }
    const entries = await loadThemeCatalog(themesDir);
    const entry = entries.find((item) => item.id === id);
    if (entry === undefined) {
      sendJson(response, 404, { ok: false, error: "unknown-theme", theme: id });
      return;
    }

    const cssPath = path.join(themesDir, entry.file);
    let mtimeMs = 0;
    try {
      mtimeMs = (await stat(cssPath)).mtimeMs;
    } catch {
      mtimeMs = 0;
    }

    const slides = url.searchParams.get("mode") === "slides";
    const cacheKey = slides ? `${id}:slides` : id;
    const cached = previewCache.get(cacheKey);
    if (cached !== undefined && cached.mtimeMs === mtimeMs && Date.now() - cached.at < PREVIEW_CACHE_MS) {
      sendText(response, 200, "text/html; charset=utf-8", cached.html);
      return;
    }

    const css = await readThemeCss(entries, id);
    if (css === undefined) {
      sendJson(response, 404, { ok: false, error: "unreadable-theme", theme: id });
      return;
    }
    const widthParam = Number.parseInt(url.searchParams.get("width") ?? "", 10);
    const width = Number.isFinite(widthParam) && widthParam >= 320 && widthParam <= 1600 ? widthParam : undefined;
    const html = slides
      ? renderSlidesDocument(entry, css, undefined, { title: entry.title, width })
      : renderThemePreviewDocument(entry, css, undefined, { width });    previewCache.set(cacheKey, { at: Date.now(), html, mtimeMs });
    sendText(response, 200, "text/html; charset=utf-8", html);
  };

  const selectionHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const method = request.method ?? "GET";
    if (method === "GET" || method === "HEAD") {
      const entries = await loadThemeCatalog(themesDir);
      const stored = await readUiState();
      sendJson(response, 200, { ok: true, selected: resolveSelection(entries, stored) });
      return;
    }
    if (method !== "POST") {
      response.writeHead(405, { allow: "GET, HEAD, POST" });
      response.end();
      return;
    }
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: "untrusted-origin" });
      return;
    }
    const body = await readJsonBody(request);
    const theme =
      typeof body === "object" && body !== null && typeof (body as { theme?: unknown }).theme === "string"
        ? (body as { theme: string }).theme
        : undefined;
    if (theme === undefined) {
      sendJson(response, 400, { ok: false, error: "missing-theme" });
      return;
    }
    const entries = await loadThemeCatalog(themesDir);
    if (!entries.some((entry) => entry.id === theme)) {
      sendJson(response, 404, { ok: false, error: "unknown-theme", theme });
      return;
    }
    await writeUiState({ theme });
    sendJson(response, 200, { ok: true, selected: theme });
  };

  /**
   * 把任意 Markdown 渲染成主题片段，供 DSH 文档预览在 shadow DOM 里就地渲染。
   * 请求体：`{ markdown, theme? }`；省略 theme 或主题无效时回落到当前选择。
   */
  const renderHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== "POST") {
      response.writeHead(405, { allow: "POST" });
      response.end();
      return;
    }
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: "untrusted-origin" });
      return;
    }
    const body = await readJsonBody(request, RENDER_BODY_LIMIT);
    const payload =
      typeof body === "object" && body !== null
        ? (body as { markdown?: unknown; theme?: unknown; mode?: unknown })
        : {};
    if (typeof payload.markdown !== "string") {
      sendJson(response, 400, { ok: false, error: "missing-markdown" });
      return;
    }
    const entries = await loadThemeCatalog(themesDir);
    const requested = typeof payload.theme === "string" && /^[A-Za-z0-9._-]+$/.test(payload.theme) ? payload.theme : undefined;
    const id =
      requested !== undefined && entries.some((entry) => entry.id === requested)
        ? requested
        : resolveSelection(entries, await readUiState());
    const entry = entries.find((item) => item.id === id);
    const css = entry === undefined ? undefined : await readThemeCss(entries, id);
    if (entry === undefined || css === undefined) {
      sendJson(response, 500, { ok: false, error: "no-theme", theme: id });
      return;
    }
    const fragment =
      payload.mode === "slides"
        ? renderSlidesFragment(entry, css, payload.markdown, { title: entry.title })
        : renderThemeFragment(entry, css, payload.markdown);
    sendJson(response, 200, {
      ok: true,
      theme: id,
      title: entry.title,
      tone: entry.tone,
      mode: payload.mode === "slides" ? "slides" : "document",
      css: fragment.css,
      html: fragment.html,
    });
  };

  /**
   * 导出文件：`{ format: pdf|docx, mode?: document|slides, markdown, theme?, title? }`。
   * 二进制直接回写，文件名放在 `content-disposition` 里。
   */
  const exportHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== "POST") {
      response.writeHead(405, { allow: "POST" });
      response.end();
      return;
    }
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: "untrusted-origin" });
      return;
    }
    const body = await readJsonBody(request, RENDER_BODY_LIMIT);
    const payload =
      typeof body === "object" && body !== null
        ? (body as { markdown?: unknown; theme?: unknown; format?: unknown; mode?: unknown; title?: unknown })
        : {};
    if (typeof payload.markdown !== "string") {
      sendJson(response, 400, { ok: false, error: "missing-markdown" });
      return;
    }
    const format = payload.format === "docx" || payload.format === "pdf" || payload.format === "pptx" ? payload.format : undefined;
    if (format === undefined) {
      sendJson(response, 400, { ok: false, error: "bad-format" });
      return;
    }
    const mode = payload.mode === "slides" ? "slides" : "document";
    if (format === "pptx" && mode !== "slides") {
      // PPTX 只从幻灯片版式生成：文稿模式的固定文本框无法还原页面排版。
      sendJson(response, 400, { ok: false, error: "bad-format" });
      return;
    }
    const entries = await loadThemeCatalog(themesDir);
    const requested = typeof payload.theme === "string" && /^[A-Za-z0-9._-]+$/.test(payload.theme) ? payload.theme : undefined;
    const id =
      requested !== undefined && entries.some((entry) => entry.id === requested)
        ? requested
        : resolveSelection(entries, await readUiState());
    const entry = entries.find((item) => item.id === id);
    const css = entry === undefined ? undefined : await readThemeCss(entries, id);
    if (entry === undefined || css === undefined) {
      sendJson(response, 500, { ok: false, error: "no-theme", theme: id });
      return;
    }
    const title =
      typeof payload.title === "string" && payload.title.trim() !== "" ? payload.title.trim() : entry.title;
    try {
      const file = await exportDocument({ format, mode, markdown: payload.markdown, theme: entry, css, title });
      sendBytes(response, 200, file.contentType, Buffer.from(file.bytes), file.filename);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      sendJson(response, 503, {
        ok: false,
        error: format === "pdf" ? "pdf-unavailable" : "export-failed",
        message: message.slice(0, 400),
        hint: format === "pdf" ? "PDF 导出需要 puppeteer 自带 Chromium，可用 npm rebuild puppeteer 或 colamd-themes export-pdf CLI 代替。" : undefined,
      });
    }
  };

  /**
   * 全屏演示窗口：POST 生成并登记一份 HTML，GET 取回。
   *
   * Electron 外壳只允许 `window.open()` 打开 `http://127.0.0.1|localhost`
   * 的地址，空 URL 会被直接 deny，所以演示内容必须由宿主用真实 URL 提供。
   */
  const presentHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" || request.method === "HEAD") {
      const token = url.searchParams.get("token");
      if (token !== null && token !== "") {
        const stored = presentStore.get(token);
        if (stored === undefined || Date.now() - stored.at > PRESENT_TTL_MS) {
          presentStore.delete(token);
          sendHtml(response, 404, "<!doctype html><meta charset=\"utf-8\"><title>预览已过期</title><p style=\"font:16px/1.6 system-ui;padding:48px\">预览已过期，请回到 DSH 重新点击「全屏」。</p>");
          return;
        }
        sendHtml(response, 200, stored.html);
        return;
      }
      // 无 token：给主题预览页签用，按当前选择现渲染示例文档。
      const entries = await loadThemeCatalog(themesDir);
      const requested =
        url.searchParams.get("theme") !== null && /^[A-Za-z0-9._-]+$/.test(url.searchParams.get("theme") as string)
          ? (url.searchParams.get("theme") as string)
          : undefined;
      const id =
        requested !== undefined && entries.some((entry) => entry.id === requested)
          ? requested
          : resolveSelection(entries, await readUiState());
      const entry = entries.find((item) => item.id === id);
      const css = entry === undefined ? undefined : await readThemeCss(entries, id);
      if (entry === undefined || css === undefined) {
        sendJson(response, 500, { ok: false, error: "no-theme", theme: id });
        return;
      }
      const mode = url.searchParams.get("mode") === "slides" ? "slides" : "document";
      sendHtml(response, 200, renderPresentDocument(entry, css, undefined, { title: entry.title, mode }));
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(405, { allow: "GET, HEAD, POST" });
      response.end();
      return;
    }
    if (!isSameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: "untrusted-origin" });
      return;
    }
    const body = await readJsonBody(request, RENDER_BODY_LIMIT);
    const payload =
      typeof body === "object" && body !== null
        ? (body as { markdown?: unknown; theme?: unknown; mode?: unknown; title?: unknown; token?: unknown })
        : {};
    if (typeof payload.markdown !== "string" || payload.markdown.trim() === "") {
      sendJson(response, 400, { ok: false, error: "missing-markdown" });
      return;
    }
    const mode = payload.mode === "slides" ? "slides" : "document";
    const entries = await loadThemeCatalog(themesDir);
    const requested = typeof payload.theme === "string" && /^[A-Za-z0-9._-]+$/.test(payload.theme) ? payload.theme : undefined;
    const id =
      requested !== undefined && entries.some((entry) => entry.id === requested)
        ? requested
        : resolveSelection(entries, await readUiState());
    const entry = entries.find((item) => item.id === id);
    const css = entry === undefined ? undefined : await readThemeCss(entries, id);
    if (entry === undefined || css === undefined) {
      sendJson(response, 500, { ok: false, error: "no-theme", theme: id });
      return;
    }
    const title =
      typeof payload.title === "string" && payload.title.trim() !== "" ? payload.title.trim() : entry.title;
    // 客户端可以复用同一个 token 反复刷新内容：这样「全屏」链接在重渲染后
    // 地址不变，页签已开着的窗口也不会因为过期而 404。
    const reuse =
      typeof payload.token === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(payload.token) ? payload.token : undefined;
    const token = reuse ?? randomUUID();
    const now = Date.now();
    for (const [key, stored] of presentStore) {
      if (now - stored.at > PRESENT_TTL_MS) presentStore.delete(key);
    }
    if (reuse !== undefined) presentStore.delete(reuse);
    while (presentStore.size >= PRESENT_MAX_ENTRIES) {
      const oldest = presentStore.keys().next();
      if (oldest.done === true) break;
      presentStore.delete(oldest.value);
    }
    presentStore.set(token, {
      html: renderPresentDocument(entry, css, payload.markdown, { title, mode }),
      at: now,
    });
    sendJson(response, 200, {
      ok: true,
      token,
      mode,
      theme: id,
      url: `${ROUTE_BASE}/present?token=${encodeURIComponent(token)}`,
    });
  };

  const disposers: (() => void)[] = [];
  const mount = (routePath: string, handler: (request: IncomingMessage, response: ServerResponse) => Promise<void>): void => {
    disposers.push(
      ctx.webServer.register({
        kind: "exact",
        path: routePath,
        handler: async (request, response) => {
          try {
            await handler(request, response);
          } catch (e) {
            if (!response.headersSent) {
              sendJson(response, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
            } else {
              response.end();
            }
          }
        },
      })
    );
  };

  mount(`${ROUTE_BASE}/catalog`, catalogHandler);
  mount(`${ROUTE_BASE}/preview`, previewHandler);
  mount(`${ROUTE_BASE}/render`, renderHandler);
  mount(`${ROUTE_BASE}/export`, exportHandler);
  mount(`${ROUTE_BASE}/present`, presentHandler);
  mount(`${ROUTE_BASE}/selection`, selectionHandler);

  return disposers;
}

/** 挂载 HTTP 接口；失败只告警，不影响 skill 注册。 */
function registerRoutes(ctx: DshPluginContext): () => void {
  try {
    const disposers = createRoutes(ctx);
    return () => {
      for (const dispose of disposers) {
        try {
          dispose();
        } catch {
          /* 已经卸载或宿主未提供 disposer */
        }
      }
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    ctx.logger?.warn?.(`[colamd-themes] UI routes unavailable: ${message}`);
    console.warn(`[colamd-themes] UI routes unavailable (host webServer changed?): ${message}`);
    return () => {};
  }
}

/** Compose the plugin: bundled skill provider + theme picker/preview routes. */
async function apply(ctx: DshPluginContext): Promise<() => void> {
  // Fault tolerance across DSH runtime upgrades: if the host's skills service
  // shape ever drifts (renamed registerProvider, changed inject contract),
  // degrade to a warning instead of crashing profile composition — the CLI
  // bins keep working regardless, and a later runtime can re-register.
  try {
    const skillRoot = fileURLToPath(new URL("../skills/colamd-themes", import.meta.url));
    registerSkill(ctx, skillRoot, await bundledSkillRank());
  } catch (e) {
    console.warn(
      `[colamd-themes] bundled skill registration failed (runtime may have changed its skills service): ` +
      `${e instanceof Error ? e.message : String(e)}`
    );
  }

  const disposeRoutes = registerRoutes(ctx);
  return disposeRoutes;
}

export { apply, inject, name };
