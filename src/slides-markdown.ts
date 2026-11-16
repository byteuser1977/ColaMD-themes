/**
 * Markdown → PPT Markdown generator + slide-directive validator.
 *
 * Targets the ColaMD-extend 2.7.13 slide layout system:
 *   - pages split on `---` (HorizontalRule); every line after the rule opens
 *     a new page — identical semantics to upstream editor/slide-directives.ts
 *   - a page header block `<!-- slide: layout` + `kicker/label/chapter -->`
 *     is only effective *before* the page's first real content
 *   - a deck block `<!-- deck logo/brand/title/meta -->` at the top drives the
 *     per-page chrome
 *
 * The generator converts a plain Markdown document into a deck by splitting
 * it into pages (h1 always breaks; h2 breaks unless it is the cover subtitle
 * or the page so far is just title+lead) and inferring one of the eleven
 * built-in layouts per page. Unknown shapes emit no directive — upstream
 * renders those pages in the default article layout, which is always safe.
 *
 * Parsing uses @lezer/markdown (the same parser family as upstream) so
 * HorizontalRule vs setext `---`, code fences and HTML comment blocks are
 * recognized with identical semantics.
 */

import { parser, GFM } from "@lezer/markdown";
import type { ValidationIssue } from "./validators.js";

// ── Shared scanning helpers ──────────────────────────────────────────────────

const mdParser = parser.configure(GFM);

/** Upstream known layouts; unknown names degrade harmlessly but warn. */
export const KNOWN_LAYOUTS: readonly string[] = Object.freeze([
  "cover", "section", "agenda", "kpi", "timeline", "steps",
  "matrix", "two-col", "figure", "quote", "closing",
]);

export const PAGE_FIELD_KEYS = new Set(["kicker", "label", "chapter"]);
export const DECK_FIELD_KEYS = new Set(["logo", "brand", "title", "meta"]);

const LAYOUT_NAME_RE = /^[a-z][a-z0-9-]*$/;

/** `<!-- slide: name` … first line of a page header block. */
const LAYOUT_RE = /^<!--\s*slide\s*:\s*([a-z][a-z0-9-]*)\b([\s\S]*?)-->$/;
/** `<!-- deck … -->` block. */
const DECK_BLOCK_RE = /^<!--\s*deck(?:\s+([\s\S]*?))?-->$/;
/** Single-line page field: `<!-- slide-kicker: … -->` etc. */
const PAGE_KEY_RE = /^<!--\s*slide-(kicker|label|chapter)\s*:\s*([\s\S]*?)-->$/;
/** Single-line deck field: `<!-- deck-logo: … -->` etc. */
const DECK_KEY_RE = /^<!--\s*deck-(logo|brand|title|meta)\s*:\s*([\s\S]*?)-->$/;
const CSS_RE = /^<!--\s*slide-css\b\s*([\s\S]*?)-->$/;
const JS_RE = /^<!--\s*slide-js\b\s*([\s\S]*?)-->$/;

/** Page-level `key: value` line inside a multi-line header block. */
const FIELD_LINE_RE = /^([a-z][a-z0-9-]*)\s*:\s*(.+)$/;

type CommentBlock = {
  source: string;
  fromLine: number;
  toLine: number;
};

/** Frontmatter range (1-based inclusive line numbers), or null. */
function frontmatterLines(lines: string[]): { from: number; to: number } | null {
  if (lines[0]?.trim() !== "---") return null;
  for (let n = 1; n < lines.length; n++) {
    if (/^(---|\.\.\.)\s*$/.test(lines[n])) return { from: 1, to: n + 1 };
  }
  return null;
}

interface DocScan {
  pages: Map<number, number[]>;      // page index → 1-based line numbers
  pageOfLine: number[];              // 0-based line → page index
  comments: CommentBlock[];
  commentLines: Set<number>;
  front: { from: number; to: number } | null;
}

/**
 * Scan a document: page assignment (`---` ends its page, next line opens a
 * new one — mirrors upstream pageOfLines) and HTML comment blocks.
 */
function scanDocument(md: string): DocScan {
  const normalized = md.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const front = frontmatterLines(lines);
  const tree = mdParser.parse(normalized);

  // HorizontalRule line numbers (frontmatter excluded — lezer parses the
  // leading `---` block as setext/hr noise, upstream skips it the same way).
  const breaks: number[] = [];
  const comments: CommentBlock[] = [];
  const frontEndChar = front
    ? lines.slice(0, front.to).reduce((acc, l) => acc + l.length + 1, 0)
    : 0;
  tree.iterate({
    enter: (node) => {
      if (node.name === "Document") return true;
      if (front && node.from < frontEndChar) return false;
      if (node.name === "HorizontalRule") {
        breaks.push(lineAt(normalized, node.from));
      } else if (node.name === "HTMLBlock" || node.name === "CommentBlock") {
        const source = normalized.slice(node.from, node.to).trim();
        if (source.startsWith("<!--")) {
          const fromLine = lineAt(normalized, node.from);
          const toLine = lineAt(normalized, Math.max(node.from, node.to - 1));
          comments.push({ source, fromLine, toLine });
        }
      }
      return true;
    },
  });

  const commentLines = new Set<number>();
  for (const c of comments) {
    for (let n = c.fromLine; n <= c.toLine; n++) commentLines.add(n);
  }

  // pageOfLine: `---` belongs to the page it ends.
  const pageOfLine: number[] = new Array(lines.length);
  let page = 0;
  let nextBreak = 0;
  for (let n = 1; n <= lines.length; n++) {
    pageOfLine[n - 1] = page;
    if (nextBreak < breaks.length && breaks[nextBreak] === n) {
      page++;
      nextBreak++;
    }
  }

  const pages = new Map<number, number[]>();
  for (let n = 1; n <= lines.length; n++) {
    const p = pageOfLine[n - 1];
    const list = pages.get(p);
    if (list) list.push(n);
    else pages.set(p, [n]);
  }

  return { pages, pageOfLine, comments, commentLines, front };
}

/** 1-based line number of a character offset. */
function lineAt(doc: string, pos: number): number {
  let line = 1;
  for (let i = 0; i < pos && i < doc.length; i++) {
    if (doc[i] === "\n") line++;
  }
  return line;
}

// ── Validation ───────────────────────────────────────────────────────────────

const UNSAFE_CSS_RE = /position\s*:\s*(absolute|fixed)|z-index\s*:|javascript\s*:|vbscript\s*:|data:text\/html/i;

/**
 * Validate a slides markdown document against the 2.7.13 directive
 * contract: layout name syntax, known layout/field keys, page-first
 * placement, and the slide-css safety subset (mirrors upstream
 * scopeSlideCSS's rejection of position:absolute/fixed, z-index and
 * pseudo-protocol URLs).
 */
export function validateSlidesMarkdown(md: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const scan = scanDocument(md);
  const lines = md.replace(/\r\n?/g, "\n").split("\n");

  // First real content line per page (comments, blanks and rules don't count).
  const firstContent = new Map<number, number>();
  for (let n = 1; n <= scan.pageOfLine.length; n++) {
    const page = scan.pageOfLine[n - 1];
    if (firstContent.has(page)) continue;
    const text = lines[n - 1] ?? "";
    if (!text.trim()) continue;
    if (/^ {0,3}(?:---|\*\*\*|___)\s*$/.test(text)) continue;
    if (scan.commentLines.has(n)) continue;
    firstContent.set(page, n);
  }

  for (const comment of scan.comments) {
    const { source, fromLine } = comment;

    const layout = LAYOUT_RE.exec(source);
    if (layout) {
      const name = layout[1];
      if (!LAYOUT_NAME_RE.test(name)) {
        issues.push({
          ruleId: "SLIDES-02",
          level: "MUST_NOT",
          message: `版式名不符合 [a-z][a-z0-9-]* 语法：${name}`,
          fix: "版式名只能小写字母开头，含小写字母、数字、连字符",
        });
      } else if (!KNOWN_LAYOUTS.includes(name)) {
        issues.push({
          ruleId: "SLIDES-03",
          level: "SHOULD",
          message: `未知版式名 ${name}（上游无害降级为无内置样式，可被自定义 CSS 接住）`,
        });
      }
      // Page-first rule: a header block only takes effect before the page's
      // first real content; later it silently degrades to a plain comment.
      const page = scan.pageOfLine[fromLine - 1];
      const first = firstContent.get(page);
      if (first !== undefined && fromLine > first) {
        issues.push({
          ruleId: "SLIDES-01",
          level: "MUST_NOT",
          message: `slide 页头块出现在第 ${page + 1} 页首个内容之后（第 ${fromLine} 行），上游会降级为普通注释`,
          fix: "把页头块移到该页第一个真实内容之前",
        });
      }
      for (const raw of source.split("\n").slice(1)) {
        const field = FIELD_LINE_RE.exec(raw.trim());
        if (field && !PAGE_FIELD_KEYS.has(field[1])) {
          issues.push({
            ruleId: "SLIDES-04",
            level: "MUST_NOT",
            message: `页头块字段键不在 kicker/label/chapter 之列：${field[1]}`,
          });
        }
      }
      continue;
    }

    const deckBlock = DECK_BLOCK_RE.exec(source);
    if (deckBlock) {
      for (const raw of (deckBlock[1] ?? "").split("\n")) {
        const field = FIELD_LINE_RE.exec(raw.trim());
        if (field && !DECK_FIELD_KEYS.has(field[1])) {
          issues.push({
            ruleId: "SLIDES-05",
            level: "MUST_NOT",
            message: `deck 块字段键不在 logo/brand/title/meta 之列：${field[1]}`,
          });
        }
      }
      continue;
    }

    const pageKey = PAGE_KEY_RE.exec(source);
    if (pageKey) continue; // single-line legacy form, key set is fixed by the regex

    const deckKey = DECK_KEY_RE.exec(source);
    if (deckKey) continue;

    const css = CSS_RE.exec(source);
    if (css && UNSAFE_CSS_RE.test(css[1])) {
      issues.push({
        ruleId: "SLIDES-06",
        level: "MUST_NOT",
        message: "slide-css 含被上游白名单拒绝的声明（position: absolute/fixed、z-index 或伪协议 URL），整段会被丢弃",
        fix: "改用布局属性（flex/grid/transform）或调整 --slide-* 令牌",
      });
      continue;
    }
    // slide-js is allowed (sandboxed upstream); nothing to check statically.
    void JS_RE;
  }

  return issues;
}

// ── Generation ───────────────────────────────────────────────────────────────

type BlockKind =
  | "h1" | "h2" | "h3" | "paragraph" | "orderedList" | "unorderedList"
  | "blockquote" | "code" | "mermaid" | "table" | "html" | "other";

interface Block {
  kind: BlockKind;
  text: string;
  /** Heading text only. */
  title?: string;
}

interface Page {
  blocks: Block[];
}

interface ListItem {
  /** Leading `**…**` bold text, if any. */
  strong: string;
  rest: string;
  raw: string;
}

export interface DeckOptions {
  brand?: string;
  title?: string;
  meta?: string;
  logo?: string;
}

const AGENDA_TITLE_RE = /议程|agenda|目录|contents|今天的安排/i;
const CLOSING_TITLE_RE = /总结|结语|下一步|收束|closing|summary|感谢|thanks/i;
const NUMERIC_START_RE = /^[$￥€]?[\d.,]+\s*(?:万|亿|%|‰|k|m|b)?/i;
const DATE_RE = /\b(?:19|20)\d{2}\s*(?:年|[-/.]\d{1,2})/;

function headingTitle(text: string): string {
  return text.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "").trim();
}

function parseListItems(text: string): ListItem[] {
  const items: ListItem[] = [];
  for (const rawLine of text.split("\n")) {
    const stripped = rawLine.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "");
    if (!stripped.trim() || stripped === rawLine) continue; // skip non-item lines
    const strongMatch = /^\*\*(.+?)\*\*\s*(.*)$/.exec(stripped.trim());
    if (strongMatch) {
      items.push({ strong: strongMatch[1].trim(), rest: strongMatch[2].trim(), raw: stripped.trim() });
    } else {
      items.push({ strong: "", rest: stripped.trim(), raw: stripped.trim() });
    }
  }
  return items;
}

/** Split a plain document into pages according to slide pagination rules. */
function splitIntoPages(md: string, scan: DocScan): Page[] {
  const normalized = md.replace(/\r\n?/g, "\n");
  const tree = mdParser.parse(normalized);

  interface TopBlock { name: string; from: number; to: number }
  const topBlocks: TopBlock[] = [];
  tree.iterate({
    enter: (node) => {
      if (node.name === "Document") return true;
      if (scan.front && node.from < normalized.length) {
        const line = lineAt(normalized, node.from);
        if (line >= scan.front.from && line <= scan.front.to) return false;
      }
      topBlocks.push({ name: node.name, from: node.from, to: node.to });
      return false; // top-level blocks only
    },
  });

  const blockOf = (b: TopBlock): Block | null => {
    const text = normalized.slice(b.from, b.to);
    if (/^ATXHeading1$/.test(b.name)) return { kind: "h1", text, title: headingTitle(text) };
    if (/^ATXHeading2$|^SetextHeading1$/.test(b.name)) return { kind: "h2", text, title: headingTitle(text) };
    if (/^ATXHeading[3-6]$|^SetextHeading2$/.test(b.name)) return { kind: "h3", text, title: headingTitle(text) };
    if (b.name === "Paragraph") return { kind: "paragraph", text };
    if (b.name === "OrderedList") return { kind: "orderedList", text };
    if (b.name === "BulletList") return { kind: "unorderedList", text };
    if (b.name === "Blockquote") return { kind: "blockquote", text };
    if (b.name === "FencedCode" || b.name === "CodeBlock") {
      const isMermaid = /^```mermaid/m.test(text);
      return { kind: isMermaid ? "mermaid" : "code", text };
    }
    if (b.name === "Table") return { kind: "table", text };
    if (b.name === "HTMLBlock" || b.name === "CommentBlock") return { kind: "html", text };
    if (b.name === "HorizontalRule") return null; // page boundary, handled below
    return { kind: "other", text };
  };

  const pages: Page[] = [];
  let current: Page = { blocks: [] };
  pages.push(current);

  // Top-level block names for two-col lookahead (h2 + 1 paragraph + h2 + list).
  for (let bi = 0; bi < topBlocks.length; bi++) {
    const b = topBlocks[bi];
    if (b.name === "HorizontalRule") {
      // `---` ends its page; next block opens a new one.
      if (current.blocks.length > 0) {
        current = { blocks: [] };
        pages.push(current);
      }
      continue;
    }
    const block = blockOf(b);
    if (!block) continue;

    const isHeading = block.kind === "h1" || block.kind === "h2";
    if (isHeading && current.blocks.length > 0) {
      const content = current.blocks;
      const first = content[0];
      const rest = content.slice(1).filter((x) => x.kind !== "html");
      let doSplit = true;
      if (block.kind === "h2" && (first?.kind === "h1" || first?.kind === "h2")) {
        // h2 directly after the page title: cover subtitle (h1 + h2, nothing
        // between) or two-col second half (title + exactly one paragraph,
        // second half opens with a list) — keep it on the same page.
        const isSubtitle = rest.length === 0;
        const isTwoCol = rest.length === 1 && rest[0].kind === "paragraph" && twoColLookahead(topBlocks, bi);
        if (isSubtitle || isTwoCol) doSplit = false;
      }
      if (block.kind === "h1" || doSplit) {
        current = { blocks: [] };
        pages.push(current);
      }
    }
    current.blocks.push(block);
  }

  // Drop trailing empty pages.
  return pages.filter((p, i) => p.blocks.length > 0 || i === 0);
}

function hasFigure(page: Page): boolean {
  return page.blocks.some((b) => b.kind === "mermaid" || b.kind === "table" || /!\[[^\]]*\]\([^)]+\)/.test(b.text) || /<img\s/i.test(b.text));
}

/**
 * two-col lookahead: the h2 at topBlocks[index] counts as the second column
 * when its content (until the next heading) opens with a bullet list —
 * matching the upstream "left = judgement, right = evidence list" shape.
 * Without the list requirement, two consecutive section pages would
 * misclassify as two-col.
 */
function twoColLookahead(topBlocks: Array<{ name: string; from: number; to: number }>, index: number): boolean {
  for (let i = index + 1; i < topBlocks.length; i++) {
    const name = topBlocks[i].name;
    if (/^ATXHeading[12]$|^SetextHeading[12]$/.test(name)) return false; // next page heading
    if (name === "BulletList") return true;
    if (name === "HorizontalRule") return false;
  }
  return false;
}

function inferLayout(page: Page, index: number, total: number): string | null {
  const headings = page.blocks.filter((b) => b.kind === "h1" || b.kind === "h2");
  const firstHeading = headings[0];
  const lists = page.blocks.filter((b) => b.kind === "orderedList" || b.kind === "unorderedList");
  const paragraphCount = page.blocks.filter((b) => b.kind === "paragraph").length;
  const title = firstHeading?.title ?? "";

  // 1. Cover: first page opened by an h1.
  if (index === 0 && firstHeading?.kind === "h1") return "cover";

  // 2. Quote: a blockquote is the main body (no lists).
  if (page.blocks.some((b) => b.kind === "blockquote") && lists.length === 0) return "quote";

  // 3. Figure: image / mermaid / table dominates.
  if (hasFigure(page)) return "figure";

  // 4. two-col: exactly two h2 halves.
  const h2s = headings.filter((b) => b.kind === "h2");
  if (h2s.length === 2 && headings.length === 2) return "two-col";

  // 5. List-driven layouts.
  if (lists.length === 1) {
    const list = lists[0];
    const ordered = list.kind === "orderedList";
    const items = parseListItems(list.text);

    if (ordered) {
      if (AGENDA_TITLE_RE.test(title)) return "agenda";
      return "steps";
    }

    // Unordered: timeline → kpi → closing → matrix → default.
    const strongItems = items.filter((it) => it.strong);
    if (items.length >= 3 && items.length <= 6 && items.filter((it) => DATE_RE.test(it.raw)).length >= 2) {
      return "timeline";
    }
    if (items.length >= 2 && items.length <= 6 &&
        strongItems.length >= Math.max(2, Math.ceil(items.length / 2)) &&
        strongItems.filter((it) => NUMERIC_START_RE.test(it.strong)).length >= Math.max(1, Math.ceil(strongItems.length / 2))) {
      return "kpi";
    }
    if (index === total - 1 && CLOSING_TITLE_RE.test(title) && items.length >= 2) {
      return "closing";
    }
    if (items.length >= 3 && items.length <= 8 && strongItems.length >= Math.ceil(items.length / 2)) {
      return "matrix";
    }
    // Last page with a plain checklist closes the deck (upstream closing layout).
    if (index === total - 1 && items.length >= 2 && items.length <= 8) return "closing";
    if (index === total - 1 && CLOSING_TITLE_RE.test(title)) return "closing";
    return null;
  }

  // 6. Section: a lone title with a one-sentence statement.
  if (firstHeading && paragraphCount === 1 && lists.length === 0 && page.blocks.length <= 3 && !hasFigure(page)) {
    return "section";
  }

  // 7. Everything else: default article page (no directive).
  return null;
}

/** One-line-ify a page title for the chrome label (keep it short). */
function chromeLabel(title: string): string {
  const clean = title.replace(/[*_`]/g, "").trim();
  return clean.length > 24 ? clean.slice(0, 23) + "…" : clean;
}

function directiveBlock(layout: string, fields: Array<[string, string]>): string {
  const present = fields.filter(([, value]) => value);
  if (present.length === 0) return `<!-- slide: ${layout} -->`;
  const lines = [`<!-- slide: ${layout}`];
  for (const [key, value] of present) lines.push(`${key}: ${value}`);
  lines.push("-->");
  return lines.join("\n");
}

/**
 * Convert a plain Markdown document into slide-deck Markdown.
 * Returns the converted document (deck block + pages joined by `---`).
 */
export function markdownToSlides(md: string, deck: DeckOptions = {}): string {
  const normalized = md.replace(/\r\n?/g, "\n");
  const scan = scanDocument(normalized);
  const pages = splitIntoPages(normalized, scan);

  // Deck chrome: explicit options win, then frontmatter title, then first h1.
  const lines = normalized.split("\n");
  let fmTitle = "";
  if (scan.front) {
    for (let n = scan.front.from; n < scan.front.to - 1 && n <= lines.length; n++) {
      const m = /^(title|标题)\s*:\s*(.+)$/i.exec(lines[n - 1]?.trim() ?? "");
      if (m) { fmTitle = m[2].trim(); break; }
    }
  }
  const firstH1 = pages.flatMap((p) => p.blocks).find((b) => b.kind === "h1");
  const deckTitle = deck.title || fmTitle || firstH1?.title || "";
  const deckBrand = deck.brand || "";
  const deckMeta = deck.meta || "";
  const deckLogo = deck.logo || "";

  const head: string[] = [];

  // Preserve frontmatter verbatim.
  if (scan.front) {
    head.push(lines.slice(scan.front.from - 1, scan.front.to).join("\n"));
  }

  // Deck block (only when there is at least a title to show).
  if (deckTitle || deckBrand || deckMeta || deckLogo) {
    const deckLines = ["<!-- deck"];
    if (deckLogo) deckLines.push(`logo: ${deckLogo}`);
    if (deckBrand) deckLines.push(`brand: ${deckBrand}`);
    if (deckTitle) deckLines.push(`title: ${deckTitle}`);
    if (deckMeta) deckLines.push(`meta: ${deckMeta}`);
    deckLines.push("-->");
    head.push(deckLines.join("\n"));
  }

  // Each page is one emission unit: directive + body, joined by `---`.
  const pageStrings: string[] = [];
  let chapter = "";
  pages.forEach((page, index) => {
    const layout = inferLayout(page, index, pages.length);

    // Chapter tracking: h1 (non-cover) and section pages promote a chapter.
    const h1 = page.blocks.find((b) => b.kind === "h1");
    if (index > 0 && (h1 || layout === "section")) {
      const heading = h1 ?? page.blocks.find((b) => b.kind === "h2");
      if (heading?.title) chapter = heading.title;
    }

    const body = page.blocks.map((b) => b.text.trim()).join("\n\n");
    if (layout) {
      const pageTitle = page.blocks.find((b) => b.kind === "h1" || b.kind === "h2")?.title ?? "";
      const label = chromeLabel(pageTitle);
      const fields: Array<[string, string]> = [
        ["kicker", chapter],
        ["label", label && label !== deckTitle ? label : ""],
        ["chapter", chapter],
      ];
      pageStrings.push(directiveBlock(layout, fields) + "\n\n" + body);
    } else {
      pageStrings.push(body);
    }
  });

  const headText = head.length > 0 ? head.join("\n\n") + "\n\n" : "";
  return headText + pageStrings.join("\n\n---\n\n") + "\n";
}
