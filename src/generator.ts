/** CSS theme file generator — v3.0 seed palette pipeline. */

import Handlebars from "handlebars";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
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

// ── Template Cache with Size Limits and Auto-Invalidation ──

interface CachedTemplate {
  compiled: HandlebarsTemplateDelegate<ThemeStyle>;
  mtimeMs: number;
  compiledAt: number;
}

const TEMPLATE_CACHE_MAX_SIZE = 10;
const TEMPLATE_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const templateCache = new Map<string, CachedTemplate>();

/**
 * Get or compile a Handlebars template with caching.
 *
 * Features:
 * - LRU-style cache (max 10 templates)
 * - File modification time detection for auto-invalidation
 * - TTL-based expiration (30 minutes)
 * - Automatic cleanup of expired entries on access
 */
function getTemplate(path?: string): HandlebarsTemplateDelegate<ThemeStyle> {
  const key = path || templatePath;

  // Check cache hit
  const cached = templateCache.get(key);
  if (cached) {
    // Check TTL expiration
    if (Date.now() - cached.compiledAt > TEMPLATE_CACHE_TTL_MS) {
      templateCache.delete(key);
    }
    // Check file modification time
    else {
      try {
        const stats = statSync(key);
        if (stats.mtimeMs > cached.mtimeMs) {
          templateCache.delete(key);
        } else {
          return cached.compiled;
        }
      } catch {
        return cached.compiled;
      }
    }
  }

  // Enforce max cache size (evict oldest entry)
  if (templateCache.size >= TEMPLATE_CACHE_MAX_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [k, v] of templateCache.entries()) {
      if (v.compiledAt < oldestTime) {
        oldestTime = v.compiledAt;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      templateCache.delete(oldestKey);
    }
  }

  // Compile new template
  const source = readFileSync(key, "utf-8");
  const compiled = Handlebars.compile(source, { noEscape: true });

  // Get modification time for invalidation
  let mtimeMs = 0;
  try {
    mtimeMs = statSync(key).mtimeMs;
  } catch {
    mtimeMs = Date.now();
  }

  templateCache.set(key, {
    compiled,
    mtimeMs,
    compiledAt: Date.now(),
  });

  return compiled;
}

/**
 * Clear all cached templates to free memory.
 */
export function clearTemplateCache(): void {
  templateCache.clear();
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
    filePath = isAbsolute(target) ? target : join(process.cwd(), target);
  } else {
    const dirPath = isAbsolute(target) ? target : join(process.cwd(), target);
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
    filePath = join(dirPath, `${safeName}.css`);
  }

  const parent = dirname(filePath);
  if (!existsSync(parent)) mkdirSync(parent, { recursive: true });

  writeFileSync(filePath, css, "utf-8");
  return filePath;
}
