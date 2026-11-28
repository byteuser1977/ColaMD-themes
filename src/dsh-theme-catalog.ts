/**
 * Markdown 主题目录 —— DSH 插件宿主侧的主题清单。
 *
 * 把 `themes/*.css`（ColaMD 契约 CSS）解析成客户端可直接渲染的 JSON：
 * 展示名、副标题、风格描述、种子色令牌，以及供筛选用的色调（浅/深）与
 * 色温（暖/冷/中性）分类。
 *
 * 只做只读解析，不依赖 ColaMD 运行时；解析失败的主题退回文件名，绝不让
 * 一张坏样式表把整个目录打挂。
 */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 表面明暗。 */
export type ThemeTone = "light" | "dark";

/** 主色色温。 */
export type ThemeAccent = "warm" | "cool" | "neutral";

/** 卡片缩略图所需的种子色。 */
export interface ThemeTokens {
  accent: string;
  accentDark: string;
  surface: string;
  panel: string;
  ink: string;
  inkMuted: string;
  border: string;
}

/** 一张主题的目录条目。 */
export interface ThemeEntry {
  /** 文件名（不含 .css），也是选择与预览 URL 的稳定 id。 */
  id: string;
  /** 展示名，来自样式表头注释，缺失时由文件名推导。 */
  title: string;
  /** 中文副标题，例如「典雅暖调」。 */
  subtitle: string;
  /** 一行风格描述。 */
  description: string;
  /** 表面明暗。 */
  tone: ThemeTone;
  /** 主色色温。 */
  accent: ThemeAccent;
  /** 缩略图令牌（已带兜底值）。 */
  tokens: ThemeTokens;
  /** 样式表字节数，供 UI 展示。 */
  size: number;
  /** 命中搜索用的可检索文本（小写）。 */
  search: string;
  /** 来源分组：`local` 为本仓库生成的主题，`core` 为 ColaMD-extend 内置主题。 */
  group: "local" | "core";
  /** 相对 `themes/` 的文件名（core 主题在 `core/` 子目录里）。 */
  file: string;
}

const SKIP_IDS = new Set(["template"]);
const CACHE_TTL_MS = 15_000;

/** 主题文件名 → 目录条目缓存，避免每次请求都重读 58 份样式表。 */
let cache: { dir: string; at: number; entries: ThemeEntry[] } | undefined;
let inflight: Promise<ThemeEntry[]> | undefined;

const TOKEN_RE = /--([a-z0-9-]+)\s*:\s*([^;{}]+);/gi;

/** 取第一个 `:root { ... }` 块（浅/深双主题文件里第一块是主主题）。 */
function firstRootBlock(css: string): string {
  const at = css.indexOf(":root");
  if (at < 0) return css;
  const open = css.indexOf("{", at);
  if (open < 0) return css;
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return css.slice(open + 1);
}

/** 收集令牌：先取主 `:root` 块，缺失的再从全文补齐。 */
function collectTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const scope of [firstRootBlock(css), css]) {
    TOKEN_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TOKEN_RE.exec(scope)) !== null) {
      const key = (match[1] ?? "").toLowerCase();
      const value = (match[2] ?? "").trim();
      if (key && value && tokens[key] === undefined) tokens[key] = value;
    }
  }
  return tokens;
}

type Rgb = [number, number, number];

/** 解析 `#rgb` / `#rrggbb` / `#rrggbbaa` / `rgb()` / `rgba()`。 */
export function toRgb(input: string | undefined): Rgb | undefined {
  if (!input) return undefined;
  const value = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,8})$/.exec(value);
  if (hex) {
    const digits = hex[1] ?? "";
    const full =
      digits.length === 3 || digits.length === 4
        ? digits.slice(0, 3).split("").map((d) => d + d).join("")
        : digits.slice(0, 6);
    if (full.length !== 6) return undefined;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ];
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(value);
  if (fn) {
    const parts = (fn[1] ?? "").split(/[,\s/]+/).filter(Boolean).slice(0, 3);
    if (parts.length < 3) return undefined;
    const rgb = parts.map((part) => {
      const pct = part.endsWith("%");
      const n = Number.parseFloat(part);
      return Number.isFinite(n) ? Math.max(0, Math.min(255, pct ? (n / 100) * 255 : n)) : 0;
    }) as Rgb;
    return rgb;
  }
  return undefined;
}

/** 相对亮度（0=黑，1=白）。 */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** RGB → HSL（h 0-360，s/l 0-1）。 */
function toHsl(rgb: Rgb): { h: number; s: number; l: number } {
  const [r, g, b] = rgb.map((c) => c / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/** 表面明暗：亮度阈值 0.45，深色主题的 `#0b0d12` 一类远低于此值。 */
export function classifyTone(surface: string | undefined): ThemeTone {
  const rgb = toRgb(surface);
  return rgb !== undefined && luminance(rgb) > 0.45 ? "light" : "dark";
}

/** 主色色温：低饱和算中性，色相在红/橙/黄区间算暖，其余算冷。 */
export function classifyAccent(accent: string | undefined): ThemeAccent {
  const rgb = toRgb(accent);
  if (rgb === undefined) return "neutral";
  const { h, s } = toHsl(rgb);
  if (s < 0.14) return "neutral";
  if (h < 70 || h >= 320) return "warm";
  return "cool";
}

/** `swiss-lemon-light` → `Swiss Lemon Light`；纯非拉丁文件名原样返回。 */
export function humanizeId(id: string): string {
  if (!/[a-z]/i.test(id)) return id;
  return id
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => (/^[a-z]/.test(part) ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}

const TITLE_RE = /ColaMD\s*主题\s*[:：]\s*([^\n*]+)/u;
const EN_TITLE_RE = /ColaMD\s*Theme\s*[:：]\s*([^\n*]+)/iu;
const STYLE_RE = /(?:风格|Style)\s*[:：]\s*([^\n*]+)/u;
/** 头部注释写到这些段落就不再是「主题是什么样」。 */
const META_STOP_RE = /^(?:契约|来源|Source|paradigm|色板备案|变量一律|ColaMD\s*2\.|主题栈|字重沿用)/iu;
/** 版本/出处说明（「逐页版式复刻精修版」）不是可读的副标题。 */
const PROVENANCE_RE = /(复刻|精修|手工|备案|模板|Generated)/u;
/** 生成流水线留下的行。 */
const NOISE_RE =
  /(?:ColaMD\s*2\.\d|Generated by|colamd-themes|beautiful-html-templates|^template\.html|^\+\s*design|^={3,}|^--[A-Za-z]|^两条硬规矩|^\d+\.\s|^身份[:：]|^提取自|^说明[:：]|^色板|^编辑器|^目的是)/iu;

/** 从文件头注释里拆出名字与中文副标题。 */
function splitTitle(raw: string): { title: string; subtitle: string } {
  // 内置主题的 banner 形如 `===== ColaMD Theme: 简白 Notion =====`，尾部等号要剪掉。
  const text = raw.trim().replace(/\s*=+\s*$/, "").trim();
  const bracket = /^(.+?)\s*[（(]\s*([^）)]+?)\s*[）)]\s*$/u.exec(text);
  if (bracket) return { title: (bracket[1] ?? "").trim(), subtitle: (bracket[2] ?? "").trim() };
  return { title: text, subtitle: "" };
}

interface HeaderLine {
  text: string;
  /** 行内容在 `*` 之后仍有缩进 —— 上一行的续行。 */
  indented: boolean;
}

/** 取文件开头的横幅注释（`/* … *\/`）并逐行去星号。 */
function headerLines(css: string): HeaderLine[] {
  const head = css.slice(0, 4000);
  const open = head.indexOf("/*");
  if (open === -1 || open > 2) return [];
  const close = head.indexOf("*/", open + 2);
  if (close === -1) return [];
  const out: HeaderLine[] = [];
  for (const raw of head.slice(open + 2, close).split(/\r?\n/)) {
    const star = raw.indexOf("*");
    const body = star === -1 ? raw : raw.slice(star + 1);
    const text = body.trim();
    if (text !== "") out.push({ text, indented: /^\s+\S/u.test(body) });
  }
  return out;
}

/** 把「学术论文（GB/T 7713）— 纯白底…」这类首行拆成副标题 + 描述。 */
function splitCaption(line: string): { subtitle: string; description: string } {
  const dash = /^(.{2,22}?)\s+—\s+(.+)$/u.exec(line) ?? /^(.{2,22}?)\s*—\s*(.{6,})$/u.exec(line);
  if (dash !== null) return { subtitle: (dash[1] ?? "").trim(), description: (dash[2] ?? "").trim() };
  const paren = /^(.{2,18}?)\s*[（(]/u.exec(line);
  // 中文短语更适合当副标题；英文描述的括注通常只是色值说明。
  if (paren !== null && /[\u4e00-\u9fff]/u.test(paren[1] ?? "")) {
    return { subtitle: (paren[1] ?? "").trim(), description: line };
  }
  return { subtitle: "", description: line };
}

/** 解析主题头注释：标题、副标题与一句风格描述。 */
function readHead(css: string, id: string): { title: string; subtitle: string; description: string } {
  const lines = headerLines(css);
  let titleText = "";
  let titleAt = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const match = TITLE_RE.exec(line.text) ?? EN_TITLE_RE.exec(line.text);
    if (match !== null) {
      titleText = (match[1] ?? "").trim();
      titleAt = i;
      break;
    }
  }

  const named = titleText === "" ? { title: "", subtitle: "" } : splitTitle(titleText);
  let title = named.title;
  // 很多主题的头部只写文件名（`ColaMD Theme: word-contract`），转成人读的名字。
  if (title === "" || title.toLowerCase() === id.toLowerCase()) title = humanizeId(id);
  let subtitle = PROVENANCE_RE.test(named.subtitle) ? "" : named.subtitle;

  let description = "";
  let caption = "";
  // 没有 `ColaMD 主题：` 横幅的样式表，文件开头只是 @font-face 说明或色板，
  // 不能当主题描述用。
  for (let i = titleAt + 1; titleAt >= 0 && i < lines.length; i += 1) {
    const line = lines[i]!;
    const style = STYLE_RE.exec(line.text);
    if (style !== null) {
      const parts = [(style[1] ?? "").trim()];
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j]!;
        if (!next.indented || META_STOP_RE.test(next.text)) break;
        parts.push(next.text);
      }
      description = parts.filter(Boolean).join(" ");
      break;
    }
    if (META_STOP_RE.test(line.text) || NOISE_RE.test(line.text)) continue;
    if (caption === "") {
      caption = line.text;
      if (description === "") description = line.text;
    }
  }

  if (subtitle === "" && caption !== "") {
    const split = splitCaption(caption);
    if (!PROVENANCE_RE.test(split.subtitle)) subtitle = split.subtitle;
  }
  subtitle = subtitle.trim();
  return { title, subtitle, description: description.trim() };
}

function pickToken(tokens: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = tokens[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

/** 解析一份样式表的元数据。 */
export function parseThemeCss(
  id: string,
  css: string,
  size: number,
  group: "local" | "core" = "local",
  file: string = `${id}.css`
): ThemeEntry {
  const tokens = collectTokens(css);
  const named = readHead(css, id);
  const description = named.description;

  const seed = (key: string): string => pickToken(tokens, `seed-${key}`);
  const semantic = (...keys: string[]): string => pickToken(tokens, ...keys);

  const accent = seed("accent") || semantic("link-color", "pele-accent") || "#8a5a2b";
  const surface =
    seed("surface") ||
    semantic("page-bg", "bg-color") ||
    "#f7f6f3";
  const entry: ThemeEntry = {
    id,
    title: named.title || humanizeId(id),
    subtitle: named.subtitle,
    description,
    tone: classifyTone(surface),
    accent: classifyAccent(accent),
    tokens: {
      accent,
      accentDark: seed("accent-dark") || accent,
      surface,
      panel: seed("panel") || semantic("panel-bg") || surface,
      ink: seed("ink") || semantic("text-color") || "#242424",
      inkMuted: seed("ink-muted") || semantic("text-secondary", "text-muted") || "#5a5a5a",
      border: seed("border") || semantic("border-color") || "rgba(0,0,0,0.12)",
    },
    size,
    search: "",
    group,
    file,
  };
  entry.search = [
    entry.id,
    entry.title,
    entry.subtitle,
    entry.description,
    entry.tone,
    entry.accent,
    group === "core" ? "colamd 内置 builtin core" : "local 生成",
  ]
    .join(" ")
    .toLowerCase();
  return entry;
}

/** 主题目录的绝对路径：`dist/dsh-theme-catalog.js` → `<pkg>/themes`。 */
export function themesDirFrom(moduleUrl: string): string {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), "..", "themes");
}

/**
 * 读取并解析整个主题目录。
 *
 * @param dir 主题目录绝对路径。
 * @returns 按名字排序的条目；目录不存在时返回空数组。
 */
export async function loadThemeCatalog(dir: string): Promise<ThemeEntry[]> {
  const now = Date.now();
  if (cache !== undefined && cache.dir === dir && now - cache.at < CACHE_TTL_MS) return cache.entries;
  if (inflight !== undefined) return inflight;

  inflight = (async () => {
    /** 顶层是本仓库生成的主题（group=local），`core/` 里是 ColaMD-extend 内置主题（group=core）。 */
    const scan = async (sub: string, group: "local" | "core", prefix: string): Promise<ThemeEntry[]> => {
      let names: string[];
      try {
        names = await readdir(path.join(dir, sub));
      } catch {
        return [];
      }
      const files = names
        .filter((name) => name.toLowerCase().endsWith(".css"))
        .filter((name) => !SKIP_IDS.has(name.replace(/\.css$/i, "").toLowerCase()))
        .sort((left, right) => left.localeCompare(right));
      const entries = await Promise.all(
        files.map(async (file) => {
          const base = file.replace(/\.css$/i, "");
          const full = path.join(dir, sub, file);
          try {
            const [css, info] = await Promise.all([readFile(full, "utf8"), stat(full)]);
            const id = `${prefix}${base}`;
            const rel = sub === "" ? file : `${sub}/${file}`;
            return parseThemeCss(id, css, info.size, group, rel);
          } catch {
            return undefined;
          }
        })
      );
      return entries.filter((entry): entry is ThemeEntry => entry !== undefined);
    };

    // core 主题文件名本身已带 `colamd-` 前缀，id 直接用文件名，避免与本地主题重名。
    const [local, core] = await Promise.all([scan("", "local", ""), scan("core", "core", "")]);
    const list = [...local, ...core];
    list.sort((left, right) => {
      if (left.group !== right.group) return left.group === "local" ? -1 : 1;
      return left.title.localeCompare(right.title, "zh-Hans-CN");
    });
    cache = { dir, at: Date.now(), entries: list };
    return list;
  })();

  try {
    return await inflight;
  } finally {
    inflight = undefined;
  }
}

/** 清空目录缓存（主题文件增删后由导出流程调用）。 */
export function invalidateThemeCatalog(): void {
  cache = undefined;
}
