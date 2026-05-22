/** CSS theme file generator using Handlebars templates. */

import Handlebars from "handlebars";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ThemeStyle } from "./models.js";
import { normalizeThemeStyle } from "./color-utils.js";
import { lighten, darken } from "./color-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, "templates", "theme-template.hbs");

Handlebars.registerHelper("lighten", (hex: unknown, factor: unknown) => {
  return lighten(String(hex), Number(factor));
});

Handlebars.registerHelper("darken", (hex: unknown, factor: unknown) => {
  return darken(String(hex), Number(factor));
});

let compiledTemplate: HandlebarsTemplateDelegate<ThemeStyle> | null = null;

function getTemplate(): HandlebarsTemplateDelegate<ThemeStyle> {
  if (!compiledTemplate) {
    const source = readFileSync(templatePath, "utf-8");
    compiledTemplate = Handlebars.compile(source, { noEscape: true });
  }
  return compiledTemplate;
}

export function generateCss(style: ThemeStyle): string {
  normalizeThemeStyle(style);
  const template = getTemplate();
  return template(style);
}

export function writeThemeFile(
  style: ThemeStyle,
  target: string = "themes"
): string {
  const css = generateCss(style);
  const safeName = style.name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

  // If target ends with .css, treat it as a direct file path
  let filePath: string;
  if (target.endsWith(".css")) {
    filePath = join(process.cwd(), target);
  } else {
    // Treat as a directory
    const dirPath = join(process.cwd(), target);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    filePath = join(dirPath, `${safeName}.css`);
  }

  const parent = dirname(filePath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }

  writeFileSync(filePath, css, "utf-8");
  return filePath;
}
