/**
 * 最小 OOXML 生成器 —— 纯同步、零依赖，产出真正的 `.docx` / `.pptx`。
 *
 * 两个 builder 都只做「够用」的那一层：WordprocessingML 里给出 Normal /
 * Heading1-4 / Quote / Code / ListParagraph 与编号定义，PresentationML 里
 * 给出 master + 单个 blank layout + theme，每页用显式文本框排标题、正文与
 * 代码块。包体通过 `zipStore` 以 STORE 方式写出，字节可复现。
 *
 * 单位备忘：Word 用 twip（1/20 磅），DrawingML 用 EMU（914400 = 1 英寸），
 * 字号一律写半磅（`w:sz`）或百分之一磅（`a:rPr@sz`）。
 */

import { zipStore } from "./dsh-zip.js";

/** 文档块模型：docx 与将来的其它导出器共用。 */
export type DocBlock =
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "code"; text: string; lang?: string }
  | { kind: "quote"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "divider" };

/** 版式与字体覆盖项；缺省值见各 builder。 */
export interface OfficeMeta {
  /** 主色，形如 `#b0401f`；docx 仅在给出时用于标题/引用，pptx 标题始终使用。 */
  accent?: string;
  /** 正文字体，例如 `Source Han Serif SC`。 */
  fontBody?: string;
  /** 等宽字体，例如 `JetBrains Mono`。 */
  fontMono?: string;
  /** 文档标题，写入 core.xml。 */
  title?: string;
}

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
/** 所有 zip 条目共用的固定时间戳，保证同一输入产出同一字节。 */
const FIXED_DATE = new Date(Date.UTC(2024, 0, 1));
const DEFAULT_ACCENT = "B0401F";
const DEFAULT_FONT_BODY = "Calibri";
const DEFAULT_FONT_MONO = "Consolas";
/** A4 去掉左右各 1440 twip 页边距后的正文宽度。 */
const CONTENT_WIDTH_TWIPS = 9026;

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";

/** 转义 XML 文本/属性，并剔除 XML 1.0 不接受的控制字符。 */
function esc(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 把 `#b0401f` / `b0401f` 规范成大写六位 RGB；非法值退回 fallback。 */
function hex(value: string | undefined, fallback: string): string {
  if (value === undefined) return fallback;
  const raw = value.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : fallback;
}

/** 字体名只做去空白与转义，保留调用方给的原名。 */
function font(value: string | undefined, fallback: string): string {
  const name = (value ?? "").trim();
  return name === "" ? fallback : name;
}

/** 把若干「路径 → 文本」条目打包成 zip。 */
function pack(files: ReadonlyArray<readonly [string, string]>): Uint8Array {
  const encoder = new TextEncoder();
  return zipStore(files.map(([path, text]) => ({ path, data: encoder.encode(text), date: FIXED_DATE })));
}

// ---------------------------------------------------------------------------
// docx
// ---------------------------------------------------------------------------

/** 一个 Word 文本 run；`inner` 里可以放 `w:br` 实现段内换行。 */
function wRun(text: string, rPr = ""): string {
  return `<w:r>${rPr === "" ? "" : `<w:rPr>${rPr}</w:rPr>`}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

/** 按换行拆成多个 run，行间用 `w:br`（必须是 run 的子元素）。 */
function wLines(text: string, rPr = ""): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, i) => `<w:r>${rPr === "" ? "" : `<w:rPr>${rPr}</w:rPr>`}${i > 0 ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`)
    .join("");
}

function wParagraph(inner: string, pPr = ""): string {
  return `<w:p>${pPr === "" ? "" : `<w:pPr>${pPr}</w:pPr>`}${inner}</w:p>`;
}

const wFonts = (name: string): string =>
  `<w:rFonts w:ascii="${esc(name)}" w:hAnsi="${esc(name)}" w:eastAsia="${esc(name)}" w:cs="${esc(name)}"/>`;

/** Heading1-4 样式；level 5/6 复用 Heading4。 */
function headingStyle(level: 1 | 2 | 3 | 4, accent: string | undefined, bodyFont: string): string {
  const sizes = { 1: 40, 2: 32, 3: 28, 4: 24 } as const;
  const before = { 1: 360, 2: 280, 3: 240, 4: 200 } as const;
  const after = { 1: 160, 2: 120, 3: 100, 4: 80 } as const;
  const color = accent === undefined ? "" : `<w:color w:val="${accent}"/>`;
  return `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${before[level]}" w:after="${after[level]}"/><w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr>${wFonts(bodyFont)}<w:b/><w:bCs/>${color}<w:sz w:val="${sizes[level]}"/><w:szCs w:val="${sizes[level]}"/></w:rPr></w:style>`;
}

/** 9 级编号定义：bullet（numId 1）与 decimal（numId 2）。 */
function numberingXml(): string {
  const levels = (ordered: boolean): string =>
    Array.from({ length: 9 }, (_, lvl) => {
      const indent = 720 + lvl * 360;
      const fmt = ordered ? "decimal" : "bullet";
      const text = ordered ? `%${lvl + 1}.` : "•";
      const suff = ordered ? '<w:suff w:val="space"/>' : "";
      return `<w:lvl w:ilvl="${lvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/>${suff}<w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${indent}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/></w:rPr></w:lvl>`;
    }).join("");
  return `${XML_DECL}<w:numbering xmlns:w="${W_NS}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels(false)}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${levels(true)}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`;
}

function docxStyles(meta: OfficeMeta): string {
  const bodyFont = font(meta.fontBody, DEFAULT_FONT_BODY);
  const monoFont = font(meta.fontMono, DEFAULT_FONT_MONO);
  const accent = meta.accent === undefined ? undefined : hex(meta.accent, DEFAULT_ACCENT);
  const quoteEdge = accent ?? "BFBFBF";
  return `${XML_DECL}<w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr>${wFonts(bodyFont)}<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="160" w:line="320" w:lineRule="auto"/></w:pPr><w:rPr>${wFonts(bodyFont)}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>${headingStyle(1, accent, bodyFont)}${headingStyle(2, accent, bodyFont)}${headingStyle(3, accent, bodyFont)}${headingStyle(4, accent, bodyFont)}<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${quoteEdge}"/></w:pBdr><w:spacing w:before="80" w:after="160"/><w:ind w:left="360" w:right="180"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="595959"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F5F3EF"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="120" w:right="120"/></w:pPr><w:rPr>${wFonts(monoFont)}<w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="0" w:after="80"/><w:ind w:left="720" w:hanging="360"/></w:pPr></w:style></w:styles>`;
}

/** 单元格宽度按列数均分；表头行重复、加粗、浅灰底。 */
function tableXml(header: readonly string[], rows: readonly string[][]): string {
  let cols = header.length;
  for (const row of rows) cols = Math.max(cols, row.length);
  if (cols === 0) return "";
  const width = Math.floor(CONTENT_WIDTH_TWIPS / cols);
  const grid = `<w:tblGrid>${`<w:gridCol w:w="${width}"/>`.repeat(cols)}</w:tblGrid>`;
  const cell = (text: string, isHeader: boolean): string =>
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : ""}</w:tcPr>${wParagraph(wRun(text, isHeader ? "<w:b/><w:bCs/>" : ""), '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>')}</w:tc>`;
  const row = (cells: readonly string[], isHeader: boolean): string =>
    `<w:tr>${isHeader ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${cells.map((text) => cell(text, isHeader)).join("")}</w:tr>`;
  const headerRow = header.length === 0 ? "" : row(header, true);
  const bodyRows = rows
    .map((cells) => {
      const padded = Array.from({ length: cols }, (_, i) => cells[i] ?? "");
      return row(padded, false);
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/></w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>${grid}${headerRow}${bodyRows}</w:tbl>`;
}

function docxDocument(blocks: readonly DocBlock[]): string {
  const body: string[] = [];
  let lastWasTable = false;
  for (const block of blocks) {
    if (block.kind !== "table") lastWasTable = false;
    switch (block.kind) {
      case "heading": {
        const level = Math.min(block.level, 4);
        body.push(wParagraph(wLines(block.text), `<w:pStyle w:val="Heading${level}"/>`));
        break;
      }
      case "paragraph": {
        if (block.text.trim() === "") break;
        body.push(wParagraph(wLines(block.text)));
        break;
      }
      case "list": {
        const numId = block.ordered ? 2 : 1;
        for (const item of block.items) {
          if (item.trim() === "") continue;
          body.push(wParagraph(wLines(item), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr>`));
        }
        break;
      }
      case "code": {
        body.push(wParagraph(wLines(block.text), '<w:pStyle w:val="Code"/>'));
        break;
      }
      case "quote": {
        if (block.text.trim() === "") break;
        body.push(wParagraph(wLines(block.text), '<w:pStyle w:val="Quote"/>'));
        break;
      }
      case "table": {
        const table = tableXml(block.header, block.rows);
        if (table !== "") {
          body.push(table);
          lastWasTable = true;
        }
        break;
      }
      case "divider": {
        body.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>');
        break;
      }
    }
  }
  if (lastWasTable) body.push("<w:p/>"); // Word 不希望 body 直接以表格收尾
  const sectPr = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/><w:docGrid w:linePitch="312"/></w:sectPr>';
  return `${XML_DECL}<w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body.join("")}${sectPr}</w:body></w:document>`;
}

function coreXml(title: string): string {
  return `${XML_DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>ColaMD</dc:creator><cp:lastModifiedBy>ColaMD</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2024-01-01T00:00:00Z</dcterms:modified></cp:coreProperties>`;
}

function appXml(kind: "docx" | "pptx", slides = 0): string {
  const extra = kind === "pptx" ? `<PresentationFormat>Widescreen</PresentationFormat><Slides>${slides}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides><MMClips>0</MMClips>` : "";
  return `${XML_DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ColaMD</Application>${extra}<DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion></Properties>`;
}

/**
 * 生成一份 Word 文档。
 *
 * 标题样式为内置 Heading1-4，`level` 5/6 复用 Heading4；列表依赖
 * numbering.xml 里的 numId 1（圆点）与 2（十进制）；表格使用内联边框，
 * 不依赖 TableGrid 样式。
 */
export function buildDocx(input: { blocks: DocBlock[]; meta?: OfficeMeta }): Uint8Array {
  const meta = input.meta ?? {};
  const title = meta.title ?? "ColaMD Document";
  const contentTypes = `${XML_DECL}<Types xmlns="${CT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const rootRels = `${XML_DECL}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const documentRels = `${XML_DECL}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`;
  return pack([
    ["[Content_Types].xml", contentTypes],
    ["_rels/.rels", rootRels],
    ["docProps/core.xml", coreXml(title)],
    ["docProps/app.xml", appXml("docx")],
    ["word/document.xml", docxDocument(input.blocks)],
    ["word/_rels/document.xml.rels", documentRels],
    ["word/styles.xml", docxStyles(meta)],
    ["word/numbering.xml", numberingXml()],
  ]);
}

// ---------------------------------------------------------------------------
// pptx
// ---------------------------------------------------------------------------

interface Box {
  x: number;
  y: number;
  cx: number;
  cy: number;
}

/** 16:9 版式坐标（EMU）：标题、正文、底部代码框。 */
const TITLE_BOX: Box = { x: 838200, y: 457200, cx: 10515600, cy: 914400 };
const KICKER_BOX: Box = { x: 838200, y: 274320, cx: 10515600, cy: 274320 };
const BODY_BOX: Box = { x: 838200, y: 1600200, cx: 10515600, cy: 4572000 };
const CODE_BOX: Box = { x: 838200, y: 5486400, cx: 10515600, cy: 1005840 };

interface RunStyle {
  size: number;
  color: string;
  fontFace: string;
  bold?: boolean;
}

/** DrawingML run：始终带 latin/ea/cs 字体，避免回退到主题字体。 */
function aRun(text: string, style: RunStyle): string {
  const bold = style.bold === true ? ' b="1"' : "";
  return `<a:r><a:rPr lang="zh-CN" altLang="en-US" sz="${style.size}"${bold} dirty="0"><a:solidFill><a:srgbClr val="${style.color}"/></a:solidFill><a:latin typeface="${esc(style.fontFace)}"/><a:ea typeface="${esc(style.fontFace)}"/><a:cs typeface="${esc(style.fontFace)}"/></a:rPr><a:t>${esc(text)}</a:t></a:r>`;
}

/** 一个 a:p；multiline 文本按 `a:br` 拆行，bullet 时加项目符号。 */
function aParagraph(text: string, style: RunStyle, bullet = false): string {
  const pPr = bullet
    ? '<a:pPr marL="285750" indent="-285750"><a:lnSpc><a:spcPct val="125000"/></a:lnSpc><a:spcBef><a:spcPts val="600"/></a:spcBef><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr>'
    : '<a:pPr><a:lnSpc><a:spcPct val="125000"/></a:lnSpc><a:spcBef><a:spcPts val="600"/></a:spcBef></a:pPr>';
  const runs = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line, i) => `${i > 0 ? "<a:br/>" : ""}${aRun(line, style)}`)
    .join("");
  return `<a:p>${pPr}${runs}</a:p>`;
}

/** 一个显式文本框（txBox），可选纯色底。 */
function textBox(id: number, name: string, box: Box, paragraphs: string, fill?: string): string {
  const fillXml = fill === undefined ? "<a:noFill/>" : `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>`;
  const lineXml = fill === undefined ? "" : '<a:ln w="12700"><a:noFill/></a:ln>';
  const inset = fill === undefined ? 91440 : 137160;
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.cx}" cy="${box.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fillXml}${lineXml}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="${inset}" tIns="${inset}" rIns="${inset}" bIns="${inset}" anchor="t"/><a:lstStyle/>${paragraphs}</p:txBody></p:sp>`;
}

const EMPTY_TREE = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

/** 主题：色板以 accent 为 accent1，major/minor 字体都取 fontBody。 */
function themeXml(accent: string, bodyFont: string): string {
  const solid = (val: string): string => `<a:solidFill><a:srgbClr val="${val}"/></a:solidFill>`;
  const scheme = (val: string): string => `<a:solidFill><a:schemeClr val="${val}"/></a:solidFill>`;
  return `${XML_DECL}<a:theme xmlns:a="${A_NS}" name="ColaMD"><a:themeElements><a:clrScheme name="ColaMD"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2>${solid("1F1F1F")}</a:dk2><a:lt2>${solid("F5F3EF")}</a:lt2><a:accent1>${solid(accent)}</a:accent1><a:accent2>${solid("2F5D62")}</a:accent2><a:accent3>${solid("8C6A3F")}</a:accent3><a:accent4>${solid("3F6C8C")}</a:accent4><a:accent5>${solid("6C3F8C")}</a:accent5><a:accent6>${solid("3F8C5A")}</a:accent6><a:hlink>${solid("1F5C99")}</a:hlink><a:folHlink>${solid("7A3F8C")}</a:folHlink></a:clrScheme><a:fontScheme name="ColaMD"><a:majorFont><a:latin typeface="${esc(bodyFont)}"/><a:ea typeface="${esc(bodyFont)}"/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${esc(bodyFont)}"/><a:ea typeface="${esc(bodyFont)}"/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="ColaMD"><a:fillStyleLst>${scheme("phClr")}<a:solidFill><a:schemeClr val="phClr"><a:tint val="50000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:shade val="80000"/></a:schemeClr></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr">${scheme("phClr")}<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr">${scheme("phClr")}<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:ln w="28575" cap="flat" cmpd="sng" algn="ctr">${scheme("phClr")}<a:prstDash val="solid"/><a:miter lim="800000"/></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${scheme("phClr")}<a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:shade val="90000"/></a:schemeClr></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function slideMasterXml(): string {
  return `${XML_DECL}<p:sldMaster xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}"><p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${EMPTY_TREE}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="3200" b="1"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;
}

function slideLayoutXml(): string {
  return `${XML_DECL}<p:sldLayout xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${EMPTY_TREE}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

/** 一页幻灯片：标题 + 正文（段落/项目符号）+ 可选底部代码框。 */
function slideXml(slide: { kicker?: string; title?: string; paragraphs?: string[]; bullets?: string[]; code?: string }, meta: { accent: string; bodyFont: string; monoFont: string; ink: string }): string {
  const shapes: string[] = [];
  let id = 2;
  if (slide.kicker !== undefined && slide.kicker !== "") {
    shapes.push(textBox(id++, "Kicker", KICKER_BOX, `<a:p>${aRun(slide.kicker.toUpperCase(), { size: 1200, bold: false, color: meta.accent, fontFace: meta.monoFont })}</a:p>`));
  }
  if (slide.title !== undefined && slide.title !== "") {
    shapes.push(textBox(id++, "Title", TITLE_BOX, `<a:p>${aRun(slide.title, { size: 3200, bold: true, color: meta.accent, fontFace: meta.bodyFont })}</a:p>`));
  }
  const bodyParts: string[] = [];
  for (const text of slide.paragraphs ?? []) {
    bodyParts.push(aParagraph(text, { size: 1800, color: meta.ink, fontFace: meta.bodyFont }));
  }
  for (const text of slide.bullets ?? []) {
    bodyParts.push(aParagraph(text, { size: 1600, color: meta.ink, fontFace: meta.bodyFont }, true));
  }
  if (bodyParts.length > 0) shapes.push(textBox(id++, "Body", BODY_BOX, bodyParts.join("")));
  if (slide.code !== undefined && slide.code !== "") {
    const codeParts = slide.code
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, "    ")
      .split("\n")
      .map((line) => `<a:p><a:pPr><a:lnSpc><a:spcPct val="100000"/></a:lnSpc></a:pPr>${aRun(line, { size: 1200, color: "FFFFFF", fontFace: meta.monoFont })}</a:p>`);
    shapes.push(textBox(id++, "Code", CODE_BOX, codeParts.join(""), "1F1F1F"));
  }
  return `${XML_DECL}<p:sld xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}"><p:cSld><p:spTree>${EMPTY_TREE}${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

/**
 * 生成一份 PowerPoint 演示文稿。
 *
 * 包内只有 1 个 slideMaster、1 个 blank slideLayout 和 1 份 theme；每页的
 * 内容都是显式文本框，因此不依赖占位符继承。`widthEmu` / `heightEmu`
 * 只改 `p:sldSz`，文本框坐标仍按默认 16:9 版式计算。
 */
export function buildPptx(input: {
  slides: { kicker?: string; title?: string; paragraphs?: string[]; bullets?: string[]; code?: string }[];
  meta?: OfficeMeta & { widthEmu?: number; heightEmu?: number };
}): Uint8Array {
  const meta = input.meta ?? {};
  const accent = hex(meta.accent, DEFAULT_ACCENT);
  const bodyFont = font(meta.fontBody, DEFAULT_FONT_BODY);
  const monoFont = font(meta.fontMono, DEFAULT_FONT_MONO);
  const title = meta.title ?? "ColaMD Presentation";
  const width = meta.widthEmu !== undefined && meta.widthEmu > 0 ? Math.round(meta.widthEmu) : 12192000;
  const height = meta.heightEmu !== undefined && meta.heightEmu > 0 ? Math.round(meta.heightEmu) : 6858000;
  const slides = input.slides.length > 0 ? input.slides : [{}];
  const ink = "262626";

  const slideRels = `${XML_DECL}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
  const masterRels = `${XML_DECL}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;
  const layoutRels = `${XML_DECL}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;

  const presentationRels = `${XML_DECL}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}<Relationship Id="rId${slides.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/></Relationships>`;

  const slideIds = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("");
  const presentation = `${XML_DECL}<p:presentation xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slideIds}</p:sldIdLst><p:sldSz cx="${width}" cy="${height}" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:defaultTextStyle></p:presentation>`;

  const slideOverrides = slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  const contentTypes = `${XML_DECL}<Types xmlns="${CT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>${slideOverrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const rootRels = `${XML_DECL}<Relationships xmlns="${PKG_REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

  const files: Array<readonly [string, string]> = [
    ["[Content_Types].xml", contentTypes],
    ["_rels/.rels", rootRels],
    ["docProps/core.xml", coreXml(title)],
    ["docProps/app.xml", appXml("pptx", slides.length)],
    ["ppt/presentation.xml", presentation],
    ["ppt/_rels/presentation.xml.rels", presentationRels],
    ["ppt/presProps.xml", `${XML_DECL}<p:presentationPr xmlns:a="${A_NS}" xmlns:r="${R_NS}" xmlns:p="${P_NS}"/>`],
    ["ppt/slideMasters/slideMaster1.xml", slideMasterXml()],
    ["ppt/slideMasters/_rels/slideMaster1.xml.rels", masterRels],
    ["ppt/slideLayouts/slideLayout1.xml", slideLayoutXml()],
    ["ppt/slideLayouts/_rels/slideLayout1.xml.rels", layoutRels],
    ["ppt/theme/theme1.xml", themeXml(accent, bodyFont)],
  ];
  slides.forEach((slide, i) => {
    files.push([`ppt/slides/slide${i + 1}.xml`, slideXml(slide, { accent, bodyFont, monoFont, ink })]);
    files.push([`ppt/slides/_rels/slide${i + 1}.xml.rels`, slideRels]);
  });
  return pack(files);
}
