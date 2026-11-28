/**
 * 主题预览渲染 —— 自包含的 Markdown → 独立 HTML 文档。
 *
 * 侧边栏预览要把主题「所见即所得」地画出来，但不能依赖 ColaMD 平台渲染器
 * （`@bytechain.cn/colamd` 只是开发依赖，装到 DSH 里并不存在），因此这里
 * 自带一个小型 Markdown 渲染器：只覆盖常用语法，产出语义化 HTML，交给主题
 * 契约第 3 节（`.colamd-document`）补配色。
 *
 * 输出是一份完整 HTML 文档，客户端用 iframe 承载：CSS 完全隔离，主题里的
 * `:root` 变量不会泄漏到 Harness 界面。
 */

import { readFileSync } from "node:fs";

import type { ThemeEntry } from "./dsh-theme-catalog.js";

/** 语义标签白名单之外的内容一律转义。 */
const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

function escapeAttr(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => (ch === '"' ? "&quot;" : ESCAPE_MAP[ch] ?? ch));
}

/** 行内语法：代码 span、图片、链接、粗体、斜体、删除线、高亮。 */
function renderInline(text: string): string {
  const codes: string[] = [];
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_all, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+?)(?:\s+"([^"]*)")?\)/g,
    (_all, alt: string, src: string, title: string | undefined) =>
      `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${title ? ` title="${escapeAttr(title)}"` : ""}>`
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+?)(?:\s+"([^"]*)")?\)/g,
    (_all, label: string, href: string, title: string | undefined) =>
      `<a href="${escapeAttr(href)}"${title ? ` title="${escapeAttr(title)}"` : ""}>${label}</a>`
  );
  out = out.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>");
  // 边界除了 ASCII 空白/标点，还要允许中文、全角标点紧邻（`**粗体**、*斜体*、`），
  // 否则中文场景里的斜体会漏成字面量星号。
  out = out.replace(
    /(^|[\s(（\[「]|[^\x00-\x7f])(\*|_)(?=\S)([\s\S]*?\S)\2(?=$|[\s)）\]」.,!?;:，。！？；：、]|[^\x00-\x7f])/g,
    "$1<em>$3</em>"
  );
  out = out.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
  out = out.replace(/==(?=\S)([\s\S]*?\S)==/g, "<mark>$1</mark>");
  out = out.replace(/\u0000(\d+)\u0000/g, (_all, index: string) => `<code>${codes[Number(index)] ?? ""}</code>`);
  return out;
}

interface ListNode {
  text: string;
  ordered: boolean;
  task: boolean | null;
  children: ListNode[];
}

function paintList(nodes: ListNode[]): string {
  if (nodes.length === 0) return "";
  const tag = nodes[0]?.ordered === true ? "ol" : "ul";
  const body = nodes
    .map((node) => {
      if (node.task === null) return `<li>${renderInline(node.text)}${paintList(node.children)}</li>`;
      return (
        `<li class="task-item"><input type="checkbox" disabled${node.task ? " checked" : ""}> ` +
        `${renderInline(node.text)}${paintList(node.children)}</li>`
      );
    })
    .join("");
  return `<${tag}>${body}</${tag}>`;
}

/** 判断一行是否开启新的块级元素（段落收集到此为止）。 */
function startsBlock(line: string): boolean {
  return (
    /^\s*$/.test(line) ||
    /^\s*(#{1,6})\s+/.test(line) ||
    /^\s*(```|~~~)/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*([-*+]|\d+[.)])\s+/.test(line) ||
    /^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)
  );
}

/** 列表项：保留缩进深度、是否有序与任务框状态。 */
export interface MdListItem {
  text: string;
  /** 0 为顶层，逐级 +1。 */
  depth: number;
  ordered: boolean;
  /** `true` / `false` 表示任务框勾选态，`null` 表示普通条目。 */
  task: boolean | null;
}

/** 块级 AST：预览与导出（DOCX / PPTX / PDF）共用同一份解析结果。 */
export type MdBlock =
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; text: string; lang: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; ordered: boolean; items: MdListItem[] }
  | { kind: "table"; header: string[]; aligns: string[]; rows: string[][] }
  | { kind: "divider" };

const LIST_MARKER = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TASK_MARKER = /^\[([ xX])\]\s+(.*)$/;

/** 行数组 → 块级 AST。 */
export function parseBlocksLines(lines: string[]): MdBlock[] {
  const out: MdBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (/^\s*$/.test(line)) {
      index += 1;
      continue;
    }

    const fence = /^\s*(```|~~~)\s*([\w+#.-]*)\s*$/.exec(line);
    if (fence !== null) {
      const marker = fence[1] ?? "```";
      const language = fence[2] ?? "";
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trimStart().startsWith(marker)) {
        buffer.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      out.push({ kind: "code", text: buffer.join("\n"), lang: language });
      continue;
    }

    const heading = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading !== null) {
      const level = (heading[1] ?? "#").length as 1 | 2 | 3 | 4 | 5 | 6;
      out.push({ kind: "heading", level, text: heading[2] ?? "" });
      index += 1;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push({ kind: "divider" });
      index += 1;
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && /^\s*>/.test(lines[index] ?? "")) {
        quoted.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
        index += 1;
      }
      const inner = parseBlocksLines(quoted);
      out.push({ kind: "quote", text: inner.map((block) => blockPlainText(block)).join("\n") });
      continue;
    }

    // 表格：表头 + 分隔行
    const next = lines[index + 1] ?? "";
    if (line.includes("|") && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(next) && next.includes("-")) {
      const cells = (row: string): string[] =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
      const header = cells(line);
      const aligns = cells(next).map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        if (left) return "left";
        return "";
      });
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? "").includes("|") && !/^\s*$/.test(lines[index] ?? "")) {
        rows.push(cells(lines[index] ?? ""));
        index += 1;
      }
      out.push({ kind: "table", header, aligns, rows });
      continue;
    }

    const listItem = LIST_MARKER.exec(line);
    if (listItem !== null) {
      const items: MdListItem[] = [];
      let ordered = /\d/.test(listItem[2] ?? "");
      while (index < lines.length) {
        const current = lines[index] ?? "";
        const match = LIST_MARKER.exec(current);
        if (match !== null) {
          ordered = ordered || /\d/.test(match[2] ?? "");
          const depth = Math.floor((match[1] ?? "").replace(/\t/g, "  ").length / 2);
          const raw = match[3] ?? "";
          const task = TASK_MARKER.exec(raw);
          items.push({
            text: task ? task[2] ?? "" : raw,
            depth,
            ordered: /\d/.test(match[2] ?? ""),
            task: task ? task[1] !== " " : null,
          });
          index += 1;
          continue;
        }
        if (/^\s{2,}\S/.test(current) && !/^\s*$/.test(current)) {
          const previous = items[items.length - 1];
          if (previous !== undefined) {
            previous.text = `${previous.text} ${current.trim()}`;
          }
          index += 1;
          continue;
        }
        break;
      }
      out.push({ kind: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && !startsBlock(lines[index] ?? "")) {
      paragraph.push((lines[index] ?? "").trim());
      index += 1;
    }
    out.push({ kind: "paragraph", text: paragraph.join(" ") });
  }

  return out;
}

/**
 * 去掉 HTML 注释（含跨行），但代码块里的原样保留。
 *
 * 幻灯片指令 `<!-- slide: cover label: … -->` / `<!-- deck-brand: … -->` 在
 * ColaMD-extend 的编辑器里是注释行、不可见；文档模式若不摘掉，转义后会变成
 * 正文里的字面量 `&lt;!-- slide: … --&gt;`。
 */
function stripHtmlComments(lines: readonly string[]): string[] {
  const out: string[] = [];
  let inFence = false;
  let inComment = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    let rest = line;
    let kept = "";
    while (rest !== "") {
      if (inComment) {
        const close = rest.indexOf("-->");
        if (close < 0) {
          rest = "";
          break;
        }
        rest = rest.slice(close + 3);
        inComment = false;
        continue;
      }
      const open = rest.indexOf("<!--");
      if (open < 0) {
        kept += rest;
        break;
      }
      kept += rest.slice(0, open);
      rest = rest.slice(open + 4);
      inComment = true;
    }
    out.push(kept);
  }
  return out;
}

/** Markdown → 块级 AST。 */
export function parseBlocks(markdown: string): MdBlock[] {
  const lines = stripHtmlComments(markdown.replace(/\r\n?/g, "\n").split("\n"));
  return parseBlocksLines(lines);
}

/** 取块的纯文本（去掉行内标记），供导出与引用块复用。 */
export function blockPlainText(block: MdBlock): string {
  if (block.kind === "heading" || block.kind === "paragraph") return plainInline(block.text);
  if (block.kind === "code") return block.text;
  if (block.kind === "quote") return block.text;
  if (block.kind === "list") return block.items.map((item) => plainInline(item.text)).join("\n");
  if (block.kind === "table") return [block.header, ...block.rows].map((row) => row.join(" | ")).join("\n");
  return "";
}

/** 去掉行内 Markdown 标记，得到导出用的纯文本。 */
export function plainInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(^|[^\w*])\*([^*]+)\*/g, "$1$2")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .trim();
}

/** 列表条目 → 嵌套 `<ul>/<ol>`（按 depth 建树后交给 paintList）。 */
function renderListBlock(block: { ordered: boolean; items: MdListItem[] }): string {
  const roots: ListNode[] = [];
  const stack: { node: ListNode; depth: number }[] = [];
  for (const item of block.items) {
    const node: ListNode = { text: item.text, ordered: item.ordered, task: item.task, children: [] };
    while (stack.length > 0 && (stack[stack.length - 1]?.depth ?? -1) >= item.depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent === undefined) roots.push(node);
    else parent.node.children.push(node);
    stack.push({ node, depth: item.depth });
  }
  return paintList(roots);
}

/** 块级 AST → HTML。 */
export function renderBlocksHtml(blocks: readonly MdBlock[]): string {
  const out: string[] = [];
  for (const block of blocks) {
    if (block.kind === "heading") {
      out.push(`<h${block.level}>${renderInline(block.text)}</h${block.level}>`);
      continue;
    }
    if (block.kind === "paragraph") {
      out.push(`<p>${renderInline(block.text)}</p>`);
      continue;
    }
    if (block.kind === "code") {
      const cls = block.lang ? ` class="language-${escapeAttr(block.lang)}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(block.text)}</code></pre>`);
      continue;
    }
    if (block.kind === "quote") {
      out.push(`<blockquote>\n${renderBlocksHtml(parseBlocks(block.text))}\n</blockquote>`);
      continue;
    }
    if (block.kind === "divider") {
      out.push("<hr>");
      continue;
    }
    if (block.kind === "list") {
      out.push(renderListBlock(block));
      continue;
    }
    const th = block.header
      .map((cell, i) => `<th${block.aligns[i] ? ` style="text-align:${block.aligns[i]}"` : ""}>${renderInline(cell)}</th>`)
      .join("");
    const body = block.rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell, i) => `<td${block.aligns[i] ? ` style="text-align:${block.aligns[i]}"` : ""}>${renderInline(cell)}</td>`)
            .join("")}</tr>`
      )
      .join("\n");
    out.push(`<table>\n<thead><tr>${th}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>`);
  }
  return out.join("\n");
}

/** Markdown → 语义化 HTML（不含 `<html>` 外壳）。 */
export function renderMarkdown(markdown: string): string {
  return renderBlocksHtml(parseBlocks(markdown));
}

/** 一页幻灯片。 */
export interface Slide {
  /** 版式名（cover / section / agenda / kpi / timeline / steps / matrix / two-col / figure / quote / closing），空串为默认版式。 */
  layout: string;
  /** 页标题（页首第一个标题行）。 */
  title: string;
  /** 标题上方的小字（页头指令优先，其次取标题前紧邻的段落）。 */
  kicker: string;
  /** 页头右上的 label（`label: …`）。 */
  label: string;
  /** 页头右上的章节名（`chapter: …`）。 */
  chapter: string;
  /** 标题后的第一段，按导语排版（更大、次要色）。 */
  lead: string;
  /** 其余正文块。 */
  blocks: MdBlock[];
  /** 是否为一个 section 的首屏（续页为 false，two-col 的导出规则依赖它）。 */
  pageStart: boolean;
}

/** deck 级页眉页脚（`<!-- deck-brand: … -->` 一类指令）。 */
export interface DeckChrome {
  logo: string;
  brand: string;
  title: string;
  meta: string;
}

const SLIDE_COMMENT_OPEN = /^\s*<!--\s*(?:slide|deck)\b/;
const PAGE_FIELD_RE = /^([a-z][a-z0-9-]*)\s*:\s*(.+)$/;
const PAGE_FIELD_KEYS = new Set(["kicker", "label", "chapter"]);
const DECK_FIELD_KEYS = new Set(["logo", "brand", "title", "meta"]);
const LAYOUT_NAME_RE = /^[a-z][a-z0-9-]*$/;
const HR_LINE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const HEADING_LINE = /^\s*#{1,2}\s+/;
const YAML_FENCE = /^---\s*$/;

/** 去掉 YAML frontmatter（幻灯片源文件常带 title/author）。 */
function stripFrontmatter(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  if (lines.length > 1 && YAML_FENCE.test(lines[0] ?? "")) {
    for (let i = 1; i < lines.length; i += 1) {
      if (YAML_FENCE.test(lines[i] ?? "")) return lines.slice(i + 1).join("\n");
    }
  }
  return lines.join("\n");
}

/** 取出一段 HTML 注释的正文；`<!-- slide: cover` 这种跨行块会一直吃到 `-->`。 */
function takeCommentBlock(lines: readonly string[], start: number): { body: string; next: number } {
  const first = lines[start] ?? "";
  const open = first.indexOf("<!--");
  const rest = open >= 0 ? first.slice(open + 4) : first;
  const close = rest.indexOf("-->");
  if (close >= 0) return { body: rest.slice(0, close), next: start + 1 };
  const parts: string[] = [rest];
  let i = start + 1;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const end = line.indexOf("-->");
    if (end >= 0) {
      parts.push(line.slice(0, end));
      i += 1;
      break;
    }
    parts.push(line);
    i += 1;
  }
  return { body: parts.join("\n"), next: i };
}

/** 把 `kicker: 路线图 label: 四章` 这种同行多字段拆成字段行。 */
function splitFieldLine(text: string): string[] {
  return text
    .split(/\n/)
    .flatMap((line) => line.split(/\s+(?=[a-z][a-z0-9-]*\s*:)/))
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** 读页头字段（kicker/label/chapter）。 */
function readPageFields(text: string, target: { kicker: string; label: string; chapter: string }): void {
  for (const line of splitFieldLine(text)) {
    const field = PAGE_FIELD_RE.exec(line);
    if (field === null) continue;
    const key = field[1] ?? "";
    if (!PAGE_FIELD_KEYS.has(key)) continue;
    target[key as "kicker" | "label" | "chapter"] = (field[2] ?? "").trim();
  }
}

/** 读 deck 级字段（logo/brand/title/meta）。 */
function readDeckFields(text: string, chrome: DeckChrome): void {
  for (const line of splitFieldLine(text)) {
    const field = PAGE_FIELD_RE.exec(line);
    if (field === null) continue;
    const key = field[1] ?? "";
    if (!DECK_FIELD_KEYS.has(key)) continue;
    chrome[key as keyof DeckChrome] = (field[2] ?? "").trim();
  }
}

/** 解析一页的标题/导语/kicker 角色（与上游 PageRoles 同规则）。 */
function readRoles(blocks: readonly MdBlock[]): { titleIndex: number; leadIndex: number; kickerIndex: number } {
  let titleIndex = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.kind === "paragraph" && block.text.trim() === "") continue;
    if (block.kind === "heading" && block.level <= 4) titleIndex = i;
    break;
  }
  let leadIndex = -1;
  if (titleIndex >= 0) {
    for (let i = titleIndex + 1; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (block.kind === "paragraph" && block.text.trim() === "") continue;
      if (block.kind === "paragraph") leadIndex = i;
      break;
    }
  }
  let kickerIndex = -1;
  if (titleIndex > 0) {
    for (let i = titleIndex - 1; i >= 0; i -= 1) {
      const block = blocks[i];
      if (block.kind === "paragraph" && block.text.trim() === "") continue;
      if (block.kind === "paragraph") kickerIndex = i;
      break;
    }
  }
  return { titleIndex, leadIndex, kickerIndex };
}

/** 把一页的原始行收成一页幻灯片。 */
function buildSlide(
  pageLines: readonly string[],
  directives: { layout: string; kicker: string; label: string; chapter: string },
  pageStart: boolean
): Slide | null {
  const blocks = parseBlocksLines([...pageLines]);
  const { titleIndex, leadIndex, kickerIndex } = readRoles(blocks);
  const heading = titleIndex >= 0 ? blocks[titleIndex] : undefined;
  const title = heading !== undefined && heading.kind === "heading" ? heading.text.trim() : "";
  const leadBlock = leadIndex >= 0 ? blocks[leadIndex] : undefined;
  const lead = leadBlock !== undefined && leadBlock.kind === "paragraph" ? leadBlock.text : "";
  const kickerBlock = kickerIndex >= 0 && directives.kicker === "" ? blocks[kickerIndex] : undefined;
  const kicker =
    directives.kicker !== ""
      ? directives.kicker
      : kickerBlock !== undefined && kickerBlock.kind === "paragraph"
        ? plainInline(kickerBlock.text)
        : "";
  const body = blocks.filter((_, i) => i !== titleIndex && i !== leadIndex && i !== kickerIndex);
  while (body.length > 0 && body[0]?.kind === "divider") body.shift();
  while (body.length > 0 && body[body.length - 1]?.kind === "divider") body.pop();
  if (title === "" && lead === "" && body.length === 0 && kicker === "") return null;
  return {
    layout: directives.layout,
    title,
    kicker,
    label: directives.label,
    chapter: directives.chapter,
    lead,
    blocks: body,
    pageStart,
  };
}

/**
 * 把 Markdown 切成幻灯片页。
 *
 * 分页与上游 ColaMD-extend 一致：`---` 分隔线归它结束的那一页，下一行开新页；
 * 页首可写 `<!-- slide: <layout>` 多行块（内含 `kicker:/label:/chapter:` 字段），
 * 也兼容单行 `<!-- slide-kicker: … -->`；`<!-- deck-brand: … -->` 一类进入 deck 页眉。
 * 一个 `---` 都没有的普通文档退回「按 `#`/`##` 标题分页」，避免把长文切碎。
 */
export function splitDeck(markdown: string, fallbackTitle = ""): Slide[] {
  const source = stripFrontmatter(markdown);
  const lines = source.split("\n");
  const chrome: DeckChrome = { logo: "", brand: "", title: "", meta: "" };

  type Page = { lines: string[]; layout: string; kicker: string; label: string; chapter: string; hasContent: boolean };
  const pages: Page[] = [];
  let page: Page = { lines: [], layout: "", kicker: "", label: "", chapter: "", hasContent: false };
  const flush = (): void => {
    if (page.hasContent || page.layout !== "" || page.kicker !== "" || page.label !== "" || page.chapter !== "") pages.push(page);
    page = { lines: [], layout: "", kicker: "", label: "", chapter: "", hasContent: false };
  };

  let sawRule = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (SLIDE_COMMENT_OPEN.test(line)) {
      const { body, next } = takeCommentBlock(lines, i);
      i = next - 1;
      const text = body.trim();
      if (/^slide-(css|js)\b/.test(text)) continue;
      // `<!-- deck-brand: X -->` 与跨行的 `<!-- deck-brand: X` + `deck-meta: Y -->` 都归到 deck 字段。
      if (/^deck\b/.test(text)) {
        const normalized = text
          .split("\n")
          .map((line) => line.trim().replace(/^deck-/, "").replace(/^deck\s+/, ""))
          .join("\n");
        readDeckFields(normalized, chrome);
        continue;
      }
      const layout = /^slide\s*:\s*([a-z][a-z0-9-]*)\b([\s\S]*)$/.exec(text);
      if (layout !== null) {
        // 页头指令只在「本页还没出现正文」时生效，落在正文里的当普通注释丢掉。
        if (!page.hasContent) {
          page.layout = layout[1] ?? "";
          readPageFields(layout[2] ?? "", page);
        }
        continue;
      }
      const keyed = /^slide-(kicker|label|chapter)\s*:\s*([\s\S]*)$/.exec(text);
      if (keyed !== null) {
        if (!page.hasContent) {
          const key = keyed[1] as "kicker" | "label" | "chapter";
          page[key] = (keyed[2] ?? "").trim();
        }
        continue;
      }
      // 未知指令：整段吞掉，绝不能让 `<!-- … -->` 变成正文。
      continue;
    }
    if (HR_LINE.test(line)) {
      sawRule = true;
      flush();
      continue;
    }
    if (line.trim() !== "") page.hasContent = true;
    page.lines.push(line);
  }
  flush();

  let slides: Slide[] = [];
  // 单页文档也可能带页头指令（`<!-- slide: kpi -->`），有指令就走页路径，别退回按标题分页。
  const hasDirectives = pages.some((entry) => entry.layout !== "" || entry.kicker !== "" || entry.label !== "" || entry.chapter !== "");
  if (sawRule || pages.length > 1 || hasDirectives) {
    for (const entry of pages) {
      const slide = buildSlide(entry.lines, entry, true);
      if (slide !== null) slides.push(slide);
    }
  }
  if (slides.length === 0) {
    // 没有分页符的普通文档：按 `#`/`##` 标题分页，保持旧行为。
    const hasHeading = lines.some((line) => HEADING_LINE.test(line));
    const chunks: string[][] = [];
    let buffer: string[] = [];
    for (const line of lines) {
      if (SLIDE_COMMENT_OPEN.test(line)) continue;
      if (hasHeading && HEADING_LINE.test(line) && buffer.some((entry) => entry.trim() !== "")) {
        chunks.push(buffer);
        buffer = [];
      }
      buffer.push(line);
    }
    if (buffer.some((line) => line.trim() !== "")) chunks.push(buffer);
    for (const chunk of chunks) {
      const slide = buildSlide(chunk, { layout: "", kicker: "", label: "", chapter: "" }, true);
      if (slide !== null) slides.push(slide);
    }
  }

  if (slides.length === 0) {
    slides.push({ layout: "cover", title: fallbackTitle, kicker: "", label: "", chapter: "", lead: "", blocks: [], pageStart: true });
  }
  const first = slides[0];
  if (first !== undefined && first.title === "" && fallbackTitle !== "" && first.blocks.length === 0) {
    slides[0] = { ...first, title: fallbackTitle };
  }
  deckChromeCache.set(slides, chrome);
  return slides;
}

/**
 * deck 级页眉页脚只解析一次，但 `splitDeck` 的返回值是数组，
 * 这里用 WeakMap 挂一下，渲染时取出来；没有就退回主题名。
 */
const deckChromeCache = new WeakMap<readonly Slide[], DeckChrome>();

/** 取该 deck 的页眉页脚信息。 */
export function deckChrome(slides: readonly Slide[]): DeckChrome {
  return deckChromeCache.get(slides) ?? { logo: "", brand: "", title: "", meta: "" };
}

/** 幻灯片版式：尺寸一律按容器宽度（cqw）缩放，令牌可覆盖；`--slide-fit` 用于溢出时整体缩排。 */
/* ══════════════════ 幻灯片：与上游 ColaMD-extend 共用 slides.css ══════════════════
 *
 * 上游没有第二套幻灯片 HTML —— 它把编辑器的行（`div.cm-line`）加上 `cm-md-page-N`
 * / `cm-md-slide-<layout>` / `cm-md-page-title` 这类类名，再用 `themes/slides.css`
 * 排版，放映靠「只显示当前页的行」，导出靠「每页第一行 break-before: page」。
 *
 * 这里照同一套契约输出行级 DOM，样式表直接复用上游 `slides.css`（构建时随
 * `src/templates` 拷进 `dist/templates`），只在选择器层面做三处映射：
 *   `body.presenting` → `.ct-stage.presenting`、`body.slides-printing` → `.ct-stage.printing`、
 *   `#editor` → `.cm-page`（每页一个纸盒，版式属性挂在盒上）。
 * 这样主题令牌、字号阶梯、chrome/页脚、十一种版式的观感与上游逐字一致。
 */

/** 上游样式表位置（构建后位于 dist/templates/slides.css）。 */
const UPSTREAM_SLIDES_CSS = new URL("./templates/slides.css", import.meta.url);

let upstreamSlidesCss: string | null = null;

function loadUpstreamSlidesCss(): string {
  if (upstreamSlidesCss !== null) return upstreamSlidesCss;
  let loaded = "";
  try {
    loaded = readFileSync(UPSTREAM_SLIDES_CSS, "utf8");
  } catch {
    loaded = "";
  }
  upstreamSlidesCss = loaded;
  return loaded;
}

/** 把上游样式表的入口选择器映射到我们的舞台与页盒。
 *
 * 除了 `body.presenting` / `#editor` 这类结构替换，还要把 `vw` / `vh` 换成
 * `cqw` / `cqh`：主题与上游都用视口单位描述纸面比例，而我们每页是固定
 * 1920×1080 的容器，只有按容器解析才能在任何窗口尺寸下得到与上游同一套数值
 * （`--slide-page-pad-x: 3.2vw` 在 1920 宽纸上就是 61.44px）。
 */
function adaptSlidesCss(css: string): string {
  return css
    // 默认标题字体跟随「文档模式的正文/标题字体」，主题显式写了 `--slide-title-font`
    // 的仍然以主题为准（slides.css 先加载，主题后加载，同特异性后者覆盖）。
    .replace(
      /--slide-title-font:\s*var\(--slide-serif\);/g,
      "--slide-title-font: var(--font-heading, var(--font-body, var(--slide-serif)));"
    )
    .replace(/body\.slides-printing/g, ".ct-stage.printing")
    .replace(/body\.presenting/g, ".ct-stage.presenting")
    .replace(/#editor/g, ".cm-page")
    .replace(/:has\(\.cm-page\[data-slide-layout='([a-z0-9-]+)'\]\)/g, "[data-slide-layout='$1']")
    .replace(/(\d*\.?\d+)vw\b/g, "$1cqw")
    .replace(/(\d*\.?\d+)vh\b/g, "$1cqh");
}

/** 纸面与舞台：1920×1080（20 × 11.25 英寸 @96dpi，与上游 PRINT_PAPER 同一个解）。 */
const DECK_CSS = `
html, body { margin: 0; padding: 0; }
body { background: var(--page-bg, var(--seed-surface, #fff)); }
.ct-stage {
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  position: relative;
  box-sizing: border-box;
  background: var(--page-bg, var(--seed-surface, #fff));
  color: var(--text-color, var(--seed-ink, #1f1f1f));
  font-family: var(--font-body, system-ui, -apple-system, "Segoe UI", sans-serif);
}
.ct-stage .cm-page {
  position: relative;
  box-sizing: border-box;
  width: 1920px;
  height: 1080px;
  margin: 0 auto;
  overflow: hidden;
}
.ct-stage .slide-chrome,
.ct-stage .slide-foot {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 2;
}
.ct-stage .slide-chrome { top: 0; }
.ct-stage .slide-foot { bottom: 0; }
.ct-stage .cm-scroller { height: 100%; }
.ct-stage .cm-page .cm-content { height: 100%; box-sizing: border-box; }
.ct-stage .cm-line { box-sizing: border-box; }
.ct-stage.presenting .cm-page .cm-content,
.ct-stage.printing .cm-page .cm-content,
.ct-stage.flow .cm-page .cm-content {
  font-size: var(--slide-body-size, 17px);
  line-height: 1.7;
  padding-top: max(var(--slide-page-top-pad, 24px), calc(var(--slide-chrome-pad-y, 34.56px) + var(--slide-chrome-logo-h, 30px))) !important;
  padding-bottom: calc(var(--slide-foot-pad-y, 25.92px) + 1em) !important;
}
.ct-stage .cm-md-table-widget table { border-collapse: collapse; }
.ct-stage.presenting {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
.ct-stage.presenting[data-flow] {
  display: block;
  /* 整体缩放：纸面固定 1920×1080 排版，容器查询单位按纸面解析，
     缩放只改变视觉尺寸，不改字号层级（与全屏、PDF 完全同一套数值）。 */
  zoom: var(--deck-scale, 0.5);
  height: auto;
  overflow: visible;
}
.ct-stage.presenting[data-flow] .cm-page {
  display: block;
  width: 1920px;
  height: 1080px;
  margin: 0 auto 24px;
  container-type: size;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
}
.ct-stage.presenting[data-flow] .cm-page:last-of-type { margin-bottom: 0; }
.ct-stage.presenting .cm-page:not([data-active]) { display: none; }
/* 打印继承 presenting 的分版式字号，但舞台与页流必须回到文档流。 */
.ct-stage.printing { display: block !important; width: auto !important; height: auto !important; overflow: visible !important; }
/* 放映：一次一页，整页按容器缩放（flow 不走这条，它在舞台层缩放）。 */
.ct-stage.presenting:not([data-flow]) .cm-page[data-active] { display: block; zoom: var(--deck-scale, 1); }
.ct-stage.printing .cm-page { break-after: page; }
.ct-stage.printing .cm-page:last-of-type { break-after: auto; }
@media print {
  @page { size: 1920px 1080px; margin: 0; }
}
`;

/** 行内语法：复用文档渲染器的解析，只把标签换成编辑面的类名。 */
function slideInline(text: string): string {
  return renderInline(text)
    .replace(/<strong>/g, '<span class="cm-md-strong">')
    .replace(/<\/strong>/g, "</span>")
    .replace(/<em>/g, '<span class="cm-md-em">')
    .replace(/<\/em>/g, "</span>")
    .replace(/<del>/g, '<span class="cm-md-strike">')
    .replace(/<\/del>/g, "</span>")
    .replace(/<mark>/g, '<span class="cm-md-highlight">')
    .replace(/<\/mark>/g, "</span>")
    .replace(/<code>/g, '<span class="cm-md-inlinecode">')
    .replace(/<\/code>/g, "</span>")
    .replace(/<a /g, '<a class="cm-md-link" ');
}

function cmLine(classes: readonly string[], inner: string, page: number, extra = ""): string {
  return `<div class="cm-line ${classes.join(" ")}" data-page="${page}"${extra}>${inner}</div>`;
}

function listMark(item: MdListItem): string {
  if (item.ordered) return "";
  if (item.task === null) return "•";
  return item.task ? "☑" : "☐";
}

/** 一页的行级 DOM。 */
function slidePageHtml(
  slide: Slide,
  index: number,
  total: number,
  active: boolean,
  chrome: DeckChrome,
): string {
  const layout = slide.layout === "" ? "default" : slide.layout;
  const pageNo = index + 1;
  const rows: string[] = [];
  let started = false;
  const push = (classes: string[], inner: string, extra = ""): void => {
    const list = [...classes, `cm-md-slide-${layout}`, `cm-md-page-${pageNo}`];
    if (!started) {
      list.push("cm-md-page-start");
      started = true;
    }
    rows.push(cmLine(list, inner, pageNo, extra));
  };

  if (slide.kicker !== "") push(["cm-md-page-kicker"], slideInline(slide.kicker));
  if (slide.title !== "") {
    const attr = slide.kicker === "" ? "" : ` data-slide-kicker="${escapeAttr(slide.kicker)}"`;
    /* 长标题按字数收敛字号：封面/章节标题是 em 级的巨字号（封面 6.8–10.8em），
       标题一长就会撑破纸面，屏幕上被裁、导出的 PDF 也一样。这里按长度分档
       降一级字号，标题短时仍用主题原值。 */
    const titleWeight = [...slide.title].reduce((sum, ch) => sum + (/[\u3000-\u9fff]/.test(ch) ? 2 : 1), 0);
    const capScale = layout === "cover" || layout === "section" || layout === "closing"
      ? titleWeight > 30 ? 0.5 : titleWeight > 20 ? 0.62 : titleWeight > 12 ? 0.76 : 1
      : layout === "agenda"
        ? titleWeight > 24 ? 0.6 : titleWeight > 16 ? 0.75 : 1
        : 1;
    const scaleStyle = capScale === 1 ? "" : ` style="font-size: calc(var(--slide-title-size, 4.2em) * ${capScale})"`;
    push(["cm-md-page-title", "cm-md-atxheading1"], slideInline(slide.title), attr + scaleStyle);
  }
  if (slide.lead !== "") push(["cm-md-page-lead"], slideInline(slide.lead));

  let ordered = 0;
  for (const block of slide.blocks) {
    if (block.kind === "heading") {
      push([`cm-md-atxheading${block.level}`], slideInline(block.text));
      continue;
    }
    if (block.kind === "paragraph") {
      push([], slideInline(block.text));
      continue;
    }
    if (block.kind === "divider") continue;
    if (block.kind === "quote") {
      push(["cm-md-blockquote"], `<span class="cm-md-quotemark">&gt;</span>${slideInline(block.text)}`);
      continue;
    }
    if (block.kind === "code") {
      const lines = block.text.split("\n");
      lines.forEach((line, i) => {
        const cls = ["cm-md-codeblock"];
        if (i === 0) cls.push("cm-md-codeblock-first");
        if (i === lines.length - 1) cls.push("cm-md-codeblock-last");
        push(cls, `<span class="cm-md-codeblock-text">${escapeHtml(line) || "&nbsp;"}</span>`);
      });
      continue;
    }
    if (block.kind === "table") {
      const head = `<tr>${block.header.map((cell) => `<th>${slideInline(cell)}</th>`).join("")}</tr>`;
      const body = block.rows
        .map((row) => `<tr>${row.map((cell) => `<td>${slideInline(cell)}</td>`).join("")}</tr>`)
        .join("");
      push(
        ["cm-md-table-widget"],
        `<table><thead>${head}</thead><tbody>${body}</tbody></table>`,
      );
      continue;
    }
    // list
    ordered = 0;
    for (const item of block.items) {
      ordered = item.ordered ? ordered + 1 : 0;
      const mark = item.ordered ? `${ordered}.` : listMark(item);
      const indent = item.depth > 0 ? ` style="padding-left:${(item.depth * 1.6).toFixed(1)}em"` : "";
      const cls = ["cm-md-li"];
      if (item.depth > 0) cls.push("cm-md-li-nested");
      push(
        cls,
        `<span class="cm-md-listmark">${mark}</span><span class="cm-md-listitem">${slideInline(item.text)}</span>`,
        indent,
      );
    }
  }

  const activeAttr = active ? ' data-active=""' : "";
  const logo = chrome.logo === "" ? "" : `<img class="slide-chrome-logo" src="${escapeAttr(chrome.logo)}" alt="" />`;
  const right = [slide.chapter, slide.label].filter((part) => part !== "").join(" · ");
  return (
    `<section class="cm-page" data-page="${pageNo}" data-slide-layout="${escapeAttr(layout)}"${activeAttr}>` +
    `<div class="slide-chrome">` +
    `<div class="slide-chrome-left"><span class="slide-chrome-brand">${escapeHtml(chrome.brand)}</span>${logo}</div>` +
    `<div class="slide-chrome-right">${escapeHtml(right)}</div>` +
    `</div>` +
    `<div class="cm-scroller"><div class="cm-content">${rows.join("")}</div></div>` +
    `<div class="slide-foot">` +
    `<span class="slide-foot-brand">${escapeHtml(chrome.brand)}</span>` +
    `<span class="slide-foot-num">${pageNo} / ${total}</span>` +
    `</div>` +
    `</section>`
  );
}

/** 舞台：每页自带 chrome 与页脚（绝对定位），flow/presenting/printing 共用同一份结构。 */
function deckStageHtml(slides: readonly Slide[], chrome: DeckChrome, mode: "flow" | "presenting" | "printing"): string {
  const pages = slides
    // 打印时所有页都要可见（放映的 :not([data-active]) 隐藏规则会一并命中）。
    .map((slide, index) => slidePageHtml(slide, index, slides.length, mode === "printing" || mode === "flow" || index === 0, chrome))
    .join("\n");
  const first = slides[0];
  const layout = first === undefined || first.layout === "" ? "default" : first.layout;
  // flow 复用 presenting 的全部规则（字号、留白、chrome），只是把所有页同时摊开。
  // 打印同时挂 presenting：主题里不少版式字号只写在 presenting 作用域里，
  // 只挂 printing 会退回基础字号（导出 PDF 部分字体偏大/偏小的根因）。
  const stageClass = mode === "flow" ? "presenting" : mode === "printing" ? "presenting printing" : mode;
  const flowAttr = mode === "flow" ? ' data-flow="1"' : "";
  return `<div class="ct-stage ${stageClass}" data-slide-layout="${escapeAttr(layout)}"${flowAttr}>${pages}</div>`;
}

/** 逐页排版：与上游 `paginateDeck` 同一个预算，续页沿用标题。 */
export function paginateDeck(slides: readonly Slide[], budget = 820): Slide[] {
  const pages: Slide[] = [];
  for (const slide of slides) {
    const weight = blockWeights(slide.blocks);
    if (weight <= budget) {
      pages.push({ ...slide, pageStart: true });
      continue;
    }
    let current: MdBlock[] = [];
    let used = slide.title === "" ? 0 : 60;
    let pageIndex = 0;
    const flush = (): void => {
      if (current.length === 0) return;
      pages.push({
        ...slide,
        title: pageIndex === 0 ? slide.title : "",
        lead: pageIndex === 0 ? slide.lead : "",
        blocks: current,
        pageStart: pageIndex === 0,
      });
      pageIndex += 1;
      current = [];
      used = 0;
    };
    for (const block of slide.blocks) {
      const size = blockWeight(block);
      if (used + size > budget && current.length > 0) flush();
      if (size > budget) {
        for (const part of splitBlock(block, budget)) {
          if (used + blockWeight(part) > budget && current.length > 0) flush();
          current.push(part);
          used += blockWeight(part);
        }
        continue;
      }
      current.push(block);
      used += size;
    }
    flush();
  }
  return pages;
}

function blockWeight(block: MdBlock): number {
  if (block.kind === "heading") return block.text.length + 30;
  if (block.kind === "paragraph") return block.text.length + 24;
  if (block.kind === "quote") return block.text.length + 30;
  if (block.kind === "code") return block.text.split("\n").length * 34 + 40;
  if (block.kind === "table") return (block.rows.length + 1) * 34 + 40;
  if (block.kind === "divider") return 30;
  return block.items.reduce((sum, item) => sum + item.text.length + 20, 0) + 30;
}

function blockWeights(blocks: readonly MdBlock[]): number {
  return blocks.reduce((sum, block) => sum + blockWeight(block), 0);
}

function splitBlock(block: MdBlock, budget: number): MdBlock[] {
  if (block.kind === "code") {
    const lines = block.text.split("\n");
    const chunks: MdBlock[] = [];
    let current: string[] = [];
    let used = 40;
    for (const line of lines) {
      if (used + 34 > budget && current.length > 0) {
        chunks.push({ ...block, text: current.join("\n") });
        current = [];
        used = 40;
      }
      current.push(line);
      used += 34;
    }
    if (current.length > 0) chunks.push({ ...block, text: current.join("\n") });
    return chunks;
  }
  if (block.kind === "table") {
    const rows = block.rows;
    const chunks: MdBlock[] = [];
    let current: string[][] = [];
    let used = 74;
    for (const row of rows) {
      if (used + 34 > budget && current.length > 0) {
        chunks.push({ ...block, rows: current });
        current = [];
        used = 74;
      }
      current.push(row);
      used += 34;
    }
    if (current.length > 0) chunks.push({ ...block, rows: current });
    return chunks;
  }
  if (block.kind === "list") {
    const chunks: MdBlock[] = [];
    let current: MdListItem[] = [];
    let used = 30;
    for (const item of block.items) {
      if (used + item.text.length + 20 > budget && current.length > 0) {
        chunks.push({ ...block, items: current });
        current = [];
        used = 30;
      }
      current.push(item);
      used += item.text.length + 20;
    }
    if (current.length > 0) chunks.push({ ...block, items: current });
    return chunks;
  }
  return [block];
}

/** 幻灯片片段：交给 shadow DOM / 预览页，`css` 已含主题与上游版式表。 */
export function renderSlidesFragment(
  entry: ThemeEntry,
  css: string,
  markdown: string,
  options: { title?: string; width?: number; print?: boolean; present?: boolean } = {},
): ThemeFragment {
  const deck = splitDeck(markdown, options.title ?? entry.title);
  const chrome = deckChrome(deck);
  const slides = paginateDeck(deck);
  const stageMode: "flow" | "presenting" | "printing" =
    options.print === true ? "printing" : options.present === true ? "presenting" : "flow";
  const stage = deckStageHtml(slides, chrome, stageMode);
  // 片段是挂进 shadow root 的：:root 在 shadow 里不成立，主题令牌（字族、配色、
  // 间距）会全部落到 slides.css 的兜底值——这正是「文档模式正常、幻灯片字体不对」
  // 的原因。片段里统一改写成 :host，独立文档仍用 :root。
  const shadowRoot = (value: string): string => value.replace(/:root\b/g, ":host");
  const slidesCss = shadowRoot(adaptSlidesCss(loadUpstreamSlidesCss()));
  // 主题自己的幻灯片规则同样写在 body.presenting / #editor 作用域里，
  // 不一起映射就会丢掉分版式的配色（例如 pink-script-dark 的品红封面标题）。
  const themeCss = shadowRoot(adaptSlidesCss(css));
  const widthRule = options.width === undefined ? "" : `.ct-stage { width: ${options.width}px; margin: 0 auto; }`;
  return {
    // 上游的顺序是「先 slides.css 基础份，后主题覆盖」，反过来会把主题的
    // --slide-page-top-pad / --slide-kicker-size 这类令牌压回默认值。
    css: `${slidesCss}\n${themeCss}\n${DECK_CSS}\n${FRAGMENT_CSS}\n${widthRule}`,
    html: stage,
  };
}

/** 逐页 fit：装不下的页把内容整体缩小，纸面尺寸不变（与上游 zoom 方案一致）。 */
export const SLIDE_FIT_SCRIPT = `(function () {
  // 只在放映/打印时逐页收缩；flow 是流式预览，页面高度由内容撑开，不缩放。
  // 缩放落在字号上（布局属性，会重排）：transform 只影响绘制、zoom 会改动纸面的
  // 容器查询尺寸（cqw/cqh），两者在打印里都靠不住。
  var pages = [].slice.call(document.querySelectorAll('.ct-stage.presenting:not([data-flow]) .cm-page, .ct-stage.printing .cm-page'));

function fitPaper(paper) {
    var content = paper.querySelector('.cm-content');
    if (!content) return;
    content.style.fontSize = '';
    var base = parseFloat(getComputedStyle(content).fontSize) || 0;
    if (!base) return;
    var floor = base * 0.5;
    for (var i = 0; i < 8; i += 1) {
      var room = paper.clientHeight;
      var need = content.scrollHeight;
      if (!room || need <= room + 1) return;
      var current = parseFloat(getComputedStyle(content).fontSize) || base;
      var next = current * (room / need) * 0.98;
      if (next < floor) { content.style.fontSize = floor.toFixed(2) + "px"; return; }
      content.style.fontSize = next.toFixed(2) + "px";
    }
  }

  window.__colamdFitSlides = function () {
    pages.forEach(fitPaper);
    return true;
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.__colamdFitSlides(); });
  window.addEventListener('load', function () { window.__colamdFitSlides(); });
`;

/** 独立幻灯片文档：预览页签、全屏演示、幻灯片 PDF 都走这里。 */
export function renderSlidesDocument(
  entry: ThemeEntry,
  css: string,
  markdown: string = DEMO_MARKDOWN,
  options: { title?: string; width?: number; print?: boolean; present?: boolean } = {},
): string {
  const fragment = renderSlidesFragment(entry, css, markdown, options);
  const standaloneCss = fragment.css.replace(/:host\b/g, ":root");
  const title = options.title ?? entry.title;
  const bodyClass =
    options.print === true ? "colamd-slidesprinting" : options.present === true ? "colamd-slidespresenting" : "colamd-slidesflow";
  return (
    `<!doctype html>\n<html lang="zh-CN" data-theme="${escapeAttr(entry.id)}" data-tone="${entry.tone}">\n<head>\n` +
    `<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n` +
    `<title>${escapeHtml(title)}</title>\n` +
    `<style data-colamd-theme>${standaloneCss}</style>\n` +
    `</head>\n<body class="${bodyClass}">\n${fragment.html}\n<script>${SLIDE_FIT_SCRIPT}</script>\n</body>\n</html>\n`
  );
}

export const DEMO_MARKDOWN = `# 幕间评审：ColaMD 主题样张

> 一段引用用来观察主题的引用配色与左侧竖线。主题决定气质，样张负责暴露细节。

## 一、排版基线

正文的中英混排以 **灰度、行高与字距** 三项最敏感。行内代码写作 \`colamd-themes build\`，
链接形如 [主题目录](https://example.com/themes)，删除线 ~~已废弃~~ 与高亮 ==关键结论== 也要能区分。

### 1.1 列表层级

- 一级条目：主题令牌集中在 \`:root\`
  - 二级条目：种子色（seed）决定整页基调
  - 二级条目：语义色（semantic）负责组件级差异
- 一级条目：导出的 HTML 只补配色，版式交给文档外壳
1. 有序条目强调顺序
2. 有序条目亦可与无序混排

## 二、表格与代码

| 主题 | 明暗 | 主色 | 适用场景 |
| --- | --- | --- | --- |
| Elegant | 浅色 | 朱砂红 | 长文阅读、会议纪要 |
| Swiss Lemon | 浅色 | 柠檬黄 | 提案、课程讲义 |
| Linear Dark | 深色 | 冷蓝 | 技术文档、夜读 |

\`\`\`ts
const theme = await resolveTheme("elegant");
const html = render(theme.customCSS ?? "");
console.log(/\\d+/.test(html) ? "ok" : "check");
\`\`\`

## 三、收尾

- [ ] 校对所有主题的标题层级
- [x] 确认表格斑马纹可读
- [ ] 复核代码块对比度

---

样张到此结束：**换主题只需换一张样式表**。
`;

/** 预览外壳的基础版式（主题契约第 3 节只补配色，这里补齐结构与间距）。 */
const BASE_CSS = `*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  padding: 0;
  background: var(--page-bg, var(--seed-surface, #f6f5f2));
  color: var(--text-color, var(--seed-ink, #262626));
  font-family: var(--font-body, -apple-system, "Segoe UI", "Noto Sans SC", "PingFang SC", sans-serif);
  font-size: var(--editor-font-size, 16px);
  line-height: var(--leading-body, 1.78);
  letter-spacing: 0.01em;
  -webkit-font-smoothing: antialiased;
}
.colamd-document {
  max-width: var(--editor-column-width, 46rem);
  margin: 0 auto;
  padding: 3.4rem 2.2rem 6rem;
  overflow-wrap: break-word;
}
.colamd-document > :first-child { margin-top: 0; }
.colamd-document h1, .colamd-document h2, .colamd-document h3,
.colamd-document h4, .colamd-document h5, .colamd-document h6 {
  font-weight: var(--weight-display, 700);
  line-height: var(--leading-display, 1.3);
  letter-spacing: var(--tracking-display, -0.01em);
  margin: 2.1em 0 0.7em;
}
.colamd-document h1 { font-size: var(--type-display, 2rem); }
.colamd-document h2 {
  font-size: var(--type-section, 1.5rem);
  font-weight: var(--weight-section, 700);
  letter-spacing: var(--tracking-section, 0);
  margin-top: 2.4em;
}
.colamd-document h3 {
  font-size: var(--type-subhead, 1.2rem);
  font-weight: var(--weight-subhead, 650);
  letter-spacing: var(--tracking-subhead, 0);
}
.colamd-document h4 { font-size: var(--type-body, 1.05rem); }
.colamd-document p { margin: 0 0 1.05em; }
.colamd-document a { color: var(--link-color, var(--seed-accent, #8a5a2b)); text-decoration: underline; text-underline-offset: 0.18em; text-decoration-thickness: 1px; }
.colamd-document strong { font-weight: var(--weight-body, 700); color: var(--seed-emphasis, inherit); }
.colamd-document em { font-style: italic; }
.colamd-document del { color: var(--text-muted, var(--seed-ink-dim, #8a8a8a)); }
.colamd-document mark { background: var(--highlight-bg, rgba(255, 214, 102, 0.42)); color: inherit; padding: 0 0.15em; border-radius: 2px; }
.colamd-document code {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 0.9em;
  background: var(--code-bg, rgba(0, 0, 0, 0.05));
  padding: 0.15em 0.38em;
  border-radius: var(--layout-radius, 4px);
}
.colamd-document pre {
  background: var(--code-block-bg, #23252b);
  color: var(--code-block-text, #e7e7ea);
  padding: 1.05rem 1.2rem;
  border-radius: var(--layout-radius, 8px);
  overflow-x: auto;
  margin: 1.2em 0 1.5em;
  line-height: 1.62;
}
.colamd-document pre code { background: none; padding: 0; font-size: 0.86em; color: inherit; }
.colamd-document blockquote {
  margin: 1.4em 0;
  padding: 0.35em 1.1em;
  border-left: 3px solid var(--blockquote-border, var(--seed-accent, #b0401f));
  background: var(--blockquote-bg, transparent);
  color: var(--text-secondary, var(--seed-ink-muted, #555));
}
.colamd-document blockquote > :last-child { margin-bottom: 0; }
.colamd-document ul, .colamd-document ol { margin: 0 0 1.05em; padding-left: 1.5em; }
.colamd-document li { margin: 0.32em 0; }
.colamd-document li > ul, .colamd-document li > ol { margin: 0.32em 0 0.2em; }
.colamd-document li::marker { color: var(--layout-list-marker, var(--seed-accent, #b0401f)); }
.colamd-document table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.3em 0 1.6em;
  font-size: 0.94em;
  border: 1px solid var(--border-color, var(--seed-border, #d8d6d2));
}
.colamd-document thead th {
  background: var(--table-header-bg, var(--seed-panel, #eaeae9));
  font-weight: 650;
  text-align: left;
  padding: 0.6em 0.8em;
  border-bottom: 1px solid var(--border-color, var(--seed-border, #d8d6d2));
}
.colamd-document tbody td {
  padding: 0.58em 0.8em;
  border-bottom: 1px solid var(--border-color, var(--seed-border, #d8d6d2));
}
.colamd-document tbody tr:last-child td { border-bottom: none; }
.colamd-document tbody tr:nth-child(even) { background: color-mix(in srgb, var(--seed-panel, #eaeae9) 45%, transparent); }
.colamd-document hr {
  border: none;
  border-top: 1px solid var(--border-color, var(--seed-border, #d8d6d2));
  margin: 2.6em 0;
}
.colamd-document img { max-width: 100%; height: auto; border-radius: var(--layout-radius, 6px); }
.colamd-document ul:has(> li > input[type="checkbox"]) { list-style: none; padding-left: 0.2em; }
.colamd-document li > input[type="checkbox"] { margin-right: 0.5em; accent-color: var(--seed-accent, #b0401f); }
::selection { background: var(--selection-bg, var(--seed-accent-light, rgba(176, 64, 31, 0.18))); }`;

/**
 * 片段版基础样式：把独立文档里的 `html` / `body` 层改写到 shadow 宿主。
 * 主题样式表的 `:root` 由 {@link renderThemeFragment} 改写成 `:host`，两层变量因此都落在宿主上。
 */
const FRAGMENT_CSS = `${BASE_CSS.replace(/html \{[^}]*\}/, "").replace(/\nbody \{/, "\n:host {")}
:host { display: block; }
.ct-document-mount { min-height: 100%; }
/* 侧边栏普遍偏窄，主题的两端对齐会拉出字间大空档，片段渲染统一改左对齐。 */
.colamd-document p,
.colamd-document li,
.colamd-document blockquote p { text-align: start; }`;

/** 可直接注入 shadow DOM 的主题片段。 */
export interface ThemeFragment {
  /** 主题样式表（`:root` 已改写成 `:host`）加片段版基础样式。 */
  css: string;
  /** `article.colamd-document` 包裹的语义 HTML。 */
  html: string;
}

/**
 * 渲染一段真实 Markdown，产出可直接塞进 shadow root 的片段。
 *
 * @param entry 目录条目（决定 `data-theme` 与 `color-scheme`）。
 * @param css 主题样式表全文。
 * @param markdown 文档正文。
 * @returns 片段样式与正文 HTML。
 */
export function renderThemeFragment(
  entry: Pick<ThemeEntry, "id" | "title" | "subtitle" | "tone">,
  css: string,
  markdown: string
): ThemeFragment {
  const tone = entry.tone === "dark" ? "dark" : "light";
  return {
    css: `${css.replace(/:root\b/g, ":host")}\n${FRAGMENT_CSS}`,
    html: `<article class="colamd-document" data-theme="${escapeAttr(entry.id)}" data-tone="${tone}" style="color-scheme:${tone}">\n${renderMarkdown(markdown)}\n</article>`,
  };
}

/** 文档缩放到固定画布宽度的选项。 */
export interface PreviewOptions {
  /** 画布宽度上限（px），用于「手机 / 桌面」切换；不传则自适应。 */
  width?: number;
  /** 文档标题，覆盖由主题条目推导的默认标题。 */
  title?: string;
  /** 打印/导出为 A4：去掉屏幕内边距，改由 @page 提供一致的页边距。 */
  print?: boolean;
}

/** 打印/导出用：A4 无边距 + 逐页克隆内边距，续页也有左右与上下留白。 */
const DOCUMENT_PRINT_CSS = `
@page { size: A4; margin: 0; }
html, body { margin: 0 !important; padding: 0 !important; background: var(--page-bg, var(--seed-surface, #fff)); }
.colamd-document {
  max-width: none !important;
  padding: 15mm 14mm !important;
  background: var(--page-bg, var(--seed-surface, #fff));
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.colamd-document pre, .colamd-document table, .colamd-document blockquote { break-inside: avoid; }
.colamd-document h1, .colamd-document h2, .colamd-document h3 { break-after: avoid; }
`;

/**
 * 组装独立预览文档。
 *
 * @param entry 目录条目（决定标题与兜底配色）。
 * @param css 主题样式表全文。
 * @param markdown 示例文档，默认用 {@link DEMO_MARKDOWN}。
 * @param options 画布宽度等。
 * @returns 完整 HTML 文本。
 */
export function renderThemePreviewDocument(
  entry: Pick<ThemeEntry, "id" | "title" | "subtitle" | "tone">,
  css: string,
  markdown: string = DEMO_MARKDOWN,
  options: PreviewOptions = {}
): string {
  const safeCss = css.replace(/<\/style/gi, "<\\/style");
  const widthRule =
    options.width !== undefined && options.width > 0
      ? `\n.colamd-document { max-width: ${Math.round(options.width)}px; }`
      : "";
  const colorScheme = entry.tone === "dark" ? "dark" : "light";
  const title = options.title ?? (entry.subtitle ? `${entry.title} · ${entry.subtitle}` : entry.title);
  return `<!doctype html>
<html lang="zh-CN" data-theme="${escapeAttr(entry.id)}" data-tone="${colorScheme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="${colorScheme}">
<title>${escapeHtml(title)}</title>
<style>
/* ── ColaMD 主题：${escapeHtml(entry.id)} ── */
${safeCss}
</style>
<style>
${BASE_CSS}${widthRule}
</style>
${options.print === true ? `<style data-colamd-print>\n${DOCUMENT_PRINT_CSS}\n</style>\n` : ""}</head>
<body>
<article class="colamd-document">
${renderMarkdown(markdown)}
</article>
</body>
</html>
`;
}

/** 全屏演示层的样式：文档模式居中限宽，幻灯片模式一次只显示一页。 */
const PRESENT_STYLE = `<style data-colamd-present>
body.colamd-present { margin: 0; background: var(--page-bg, #f4f4f3); }
body.colamd-present-doc .colamd-document {
  max-width: 920px;
  margin: 0 auto;
  padding: 56px 32px 88px;
}
body.colamd-present-slides { overflow: hidden; height: 100vh; }
body.colamd-present-slides .ct-stage {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.present-hud {
  position: fixed;
  left: 50%;
  bottom: 18px;
  z-index: 2147483647;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border-radius: 999px;
  font: 12px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  letter-spacing: .02em;
  color: #fff;
  background: rgba(12, 12, 12, .62);
  backdrop-filter: blur(8px);
  opacity: 0;
  transition: opacity .18s ease;
  pointer-events: none;
}
body.present-hud-on .present-hud { opacity: 1; }
</style>`;

/** 全屏演示层的交互：幻灯片 ←/→ 翻页、F 切全屏、左右半屏点击翻页。 */
const PRESENT_SCRIPT = `<script data-colamd-present>
(function () {
  var body = document.body;
  body.classList.add('colamd-present');
  var stage = document.querySelector('.ct-stage.presenting');
  var pages = stage ? Array.prototype.slice.call(stage.querySelectorAll('.cm-page')) : [];
  var isSlides = pages.length > 0;
  body.classList.add(isSlides ? 'colamd-present-slides' : 'colamd-present-doc');
  var hud = document.createElement('div');
  hud.className = 'present-hud';
  body.appendChild(hud);
  var index = 0;
  function scaleToViewport() {
    if (!stage) return;
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty('--deck-scale', String(scale));
  }
  // 隐藏页量不到高度，所以只在激活时把这一页的内容缩到纸面以内（纸面尺寸不变）。
  function fitPage(page) {
    if (!page) return;
    var content = page.querySelector('.cm-content');
    if (!content) return;
    content.style.zoom = '1';
    var zoom = 1;
    for (var i = 0; i < 24; i += 1) {
      if (content.scrollHeight <= page.clientHeight + 1) break;
      zoom -= 0.04;
      if (zoom < 0.4) { zoom = 0.4; content.style.zoom = String(zoom); break; }
      content.style.zoom = String(zoom);
    }
  }
  function paint() {
    scaleToViewport();
    if (isSlides) {
      for (var i = 0; i < pages.length; i++) {
        if (i === index) pages[i].setAttribute('data-active', '');
        else pages[i].removeAttribute('data-active');
      }
      fitPage(pages[index]);
      var layout = pages[index].getAttribute('data-slide-layout') || 'default';
      stage.setAttribute('data-slide-layout', layout);
      var num = stage.querySelector('.slide-foot-num');
      if (num) num.textContent = (index + 1) + ' / ' + pages.length;
      hud.textContent = (index + 1) + ' / ' + pages.length + '  \\u2190/\\u2192 \\u7ffb\\u9875 \\u00b7 F \\u5168\\u5c4f' +
        (isFullscreen() ? '' : ' \\u00b7 \\u70b9\\u51fb\\u8fdb\\u5165\\u5168\\u5c4f');
    } else {
      hud.textContent = 'F \\u5168\\u5c4f' + (isFullscreen() ? '' : ' \\u00b7 \\u70b9\\u51fb\\u8fdb\\u5165\\u5168\\u5c4f');
    }
    body.classList.add('present-hud-on');
    clearTimeout(paint.timer);
    paint.timer = setTimeout(function () { body.classList.remove('present-hud-on'); }, 2200);
  }
  function go(delta) {
    if (!isSlides) return;
    var next = index + delta;
    if (next < 0 || next >= pages.length) return;
    index = next;
    paint();
  }
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function requestFullscreen() {
    if (isFullscreen()) return;
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!req) return;
    try {
      var pending = req.call(el);
      if (pending && pending.catch) pending.catch(function () {});
    } catch (error) {}
  }
  function toggleFullscreen() {
    if (isFullscreen()) {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) { try { exit.call(document); } catch (error) {} }
    } else requestFullscreen();
  }
  // 只有顶层窗口才自己抢全屏；嵌在 DSH 的演示层 iframe 里时交给外层容器。
  if (window.self === window.top) {
    requestFullscreen();
    setTimeout(requestFullscreen, 260);
  }
  ['click', 'keydown'].forEach(function (name) {
    window.addEventListener(name, function once() {
      requestFullscreen();
      window.removeEventListener(name, once);
    }, { once: true });
  });
  document.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Enter') { event.preventDefault(); go(1); }
    else if (key === 'ArrowLeft' || key === 'PageUp') { event.preventDefault(); go(-1); }
    else if (key === 'Home') { event.preventDefault(); index = 0; paint(); }
    else if (key === 'End') { event.preventDefault(); index = Math.max(0, pages.length - 1); paint(); }
    else if (key === 'f' || key === 'F') { event.preventDefault(); toggleFullscreen(); }
  });
  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('a')) return;
    // 还没进全屏时，第一次点击用来进全屏，不翻页。
    if (!isFullscreen()) { requestFullscreen(); return; }
    if (!isSlides) return;
    go(event.clientX > window.innerWidth / 2 ? 1 : -1);
  });
  document.addEventListener('mousemove', paint);
  window.addEventListener('resize', paint);
  paint();
})();
</script>`;

/**
 * 全屏演示文档：独立弹出窗口 / 新标签用它。
 *
 * 幻灯片模式一次只显示一页并带 ←/→ 翻页与 F 全屏；文稿模式居中限宽。
 */
export function renderPresentDocument(
  entry: ThemeEntry,
  css: string,
  markdown: string = DEMO_MARKDOWN,
  options: { title?: string; mode?: "document" | "slides" } = {}
): string {
  const mode = options.mode === "slides" ? "slides" : "document";
  const base =
    mode === "slides"
      ? renderSlidesDocument(entry, css, markdown, { title: options.title, present: true })
      : renderThemePreviewDocument(entry, css, markdown, { title: options.title });
  return base.replace("</head>", `${PRESENT_STYLE}\n</head>`).replace("</body>", `${PRESENT_SCRIPT}\n</body>`);
}
