/** CSS theme file generator — v3.0 seed palette pipeline. */

import Handlebars from "handlebars";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ThemeStyle } from "./models.js";
import { paletteToSeed } from "./models.js";
import { toRgba, normalizeThemeStyle } from "./color-utils.js";
import { matchColorSystem } from "./color-systems.js";
import { selectMermaidPreset } from "./mermaid-presets.js";
import { validateSeedPalette, summarizeIssues } from "./validators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, "templates", "theme-template.hbs");

// ── Handlebars helpers ──

Handlebars.registerHelper("rgba", (hex: unknown, alpha: unknown) => {
  return toRgba(String(hex), Number(alpha));
});

let compiledTemplate: HandlebarsTemplateDelegate<ThemeStyle> | null = null;

function getTemplate(): HandlebarsTemplateDelegate<ThemeStyle> {
  if (!compiledTemplate) {
    const source = readFileSync(templatePath, "utf-8");
    compiledTemplate = Handlebars.compile(source, { noEscape: true });
  }
  return compiledTemplate;
}

// ── Pipeline ──

export function generateCss(style: ThemeStyle): string {
  // 1. Map legacy palette → seed palette if seed is still default
  if (style.seed.accent === "#6366f1") {
    style.seed = paletteToSeed(style.palette);
  }

  // 2. Normalize from legacy extractor path
  normalizeThemeStyle(style);

  // 3. Match color system
  if (!style.colorSystemId) {
    const cs = matchColorSystem(style.seed.accent, style.seed.surface);
    style.colorSystemId = cs.id;
  }

  // 4. Select Mermaid preset
  if (!style.mermaidPresetId) {
    const mp = selectMermaidPreset(style.seed.surface, style.seed.accent);
    style.mermaidPresetId = mp.id;
  }

  // 5. Validate against paradigm
  const issues = validateSeedPalette(style.seed);
  if (issues.filter((i) => i.level === "MUST" || i.level === "MUST_NOT").length > 0) {
    console.warn("Paradigm validation issues:", summarizeIssues(issues));
  }

  // 6. Render
  const template = getTemplate();
  return template(style);
}

export function writeThemeFile(
  style: ThemeStyle,
  target: string = "themes"
): string {
  const css = generateCss(style);
  const safeName = style.name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

  let filePath: string;
  if (target.endsWith(".css")) {
    filePath = join(process.cwd(), target);
  } else {
    const dirPath = join(process.cwd(), target);
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
    filePath = join(dirPath, `${safeName}.css`);
  }

  const parent = dirname(filePath);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });

  writeFileSync(filePath, css, "utf-8");
  return filePath;
}
