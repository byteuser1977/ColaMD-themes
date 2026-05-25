/** ColaMD Theme Development Tool. */

export * from "./models.js";
export * from "./color-utils.js";
export * from "./generator.js";
export { UrlExtractor } from "./extractors/url-extractor.js";
export { DocxExtractor } from "./extractors/docx-extractor.js";
export { PdfExtractor } from "./extractors/pdf-extractor.js";
export type { Extractor } from "./extractors/base.js";

export {
  ACADEMIC_PAPER_DEFAULTS,
  BUSINESS_REPORT_DEFAULTS,
  TECHNICAL_DOC_DEFAULTS,
  generatePrintFriendlyGrayscale,
  generateMorandiPrintPalette,
  validateDocumentStyle,
  normalizeForPrinting,
  getRecommendedPreset,
  DOCUMENT_STYLE_PRESETS,
} from "./docx-style-paradigm.js";

export type {
  DocumentStyleParadigm,
  FontStyleDefinition,
  TableCellStyle,
  PrintOptimization,
  StyleValidationIssue,
} from "./docx-style-paradigm.js";
