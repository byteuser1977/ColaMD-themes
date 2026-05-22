/** Abstract base class for format extractors. */

import type { ThemeStyle } from "../models.js";

export interface Extractor {
  extract(source: string): Promise<ThemeStyle>;
  canHandle(source: string): boolean;
}
