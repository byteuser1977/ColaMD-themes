/**
 * Theme configuration persistence.
 *
 * Stores default theme and registered custom themes in ~/.colamd-themes/config.json
 * Uses async file I/O to avoid blocking the event loop.
 */

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { statSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".colamd-themes");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/** Maximum allowed CSS file size (1MB) to prevent OOM attacks */
const MAX_CSS_SIZE = 1024 * 1024;

/** Built-in themes provided by @bytechain.cn/colamd */
export const BUILTIN_THEMES = ["light", "dark", "elegant", "newsprint"] as const;
export type BuiltinTheme = (typeof BUILTIN_THEMES)[number];

export interface ThemeConfig {
  /** Default theme name (built-in or custom) */
  defaultTheme: string;
  /** Registered custom themes: name → CSS file path */
  themes: Record<string, string>;
}

async function readConfig(): Promise<ThemeConfig> {
  try {
    await access(CONFIG_FILE);
    const data = await readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as ThemeConfig;
  } catch {
    return { defaultTheme: "elegant", themes: {} };
  }
}

async function writeConfig(config: ThemeConfig): Promise<void> {
  try {
    await access(CONFIG_DIR);
  } catch {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/** Get the full config. */
export async function getConfig(): Promise<ThemeConfig> {
  return readConfig();
}

/** Set the default theme (built-in name or registered custom name). */
export async function setDefaultTheme(name: string): Promise<void> {
  const config = await readConfig();
  config.defaultTheme = name;
  await writeConfig(config);
}

/**
 * Register a custom theme.
 * @param name  Unique name (will be prefixed with "custom:" when applied)
 * @param cssPath  Absolute path to the CSS file
 */
export async function registerTheme(name: string, cssPath: string): Promise<void> {
  const config = await readConfig();
  config.themes[name] = cssPath;
  await writeConfig(config);
}

/** Remove a registered custom theme. */
export async function unregisterTheme(name: string): Promise<boolean> {
  const config = await readConfig();
  if (!(name in config.themes)) return false;
  delete config.themes[name];
  await writeConfig(config);
  return true;
}

/**
 * Sanitize theme name from file path.
 * Removes special characters and limits length to prevent injection.
 */
function sanitizeName(path: string): string {
  return basename(path, ".css")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50) || "custom";
}

/**
 * Validate CSS file before reading.
 * Checks extension, size, and basic content validity.
 */
async function validateCssFile(filePath: string): Promise<void> {
  // Check file extension
  if (!filePath.toLowerCase().endsWith(".css")) {
    throw new Error(`Theme file must have .css extension: ${filePath}`);
  }

  // Check file size (synchronous stat is acceptable for metadata)
  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    throw new Error(`Cannot access theme file: ${filePath}`);
  }

  if (stats.size > MAX_CSS_SIZE) {
    throw new Error(
      `Theme file too large (${(stats.size / 1024).toFixed(1)}KB). ` +
      `Maximum size: ${(MAX_CSS_SIZE / 1024).toFixed(0)}MB`
    );
  }

  // Read and validate content
  const content = await readFile(filePath, "utf-8");
  if (content.length < 10) {
    throw new Error(`Theme file appears to be empty or invalid: ${filePath}`);
  }
}

/**
 * Resolve a theme name to the arguments needed by the ColaMD renderer.
 *
 * @param name  Theme name. If omitted, uses the configured default.
 * @returns { themeName, customCSS? } — themeName is either a built-in name
 *          or "custom:<name>"; customCSS is the CSS content for custom themes.
 */
export async function resolveTheme(name?: string): Promise<{
  themeName: string;
  customCSS?: string;
}> {
  const config = await readConfig();
  const resolved = name ?? config.defaultTheme;

  // Check if it's a registered custom theme
  if (config.themes[resolved]) {
    const cssPath = config.themes[resolved];
    await validateCssFile(cssPath);
    const customCSS = await readFile(cssPath, "utf-8");
    return { themeName: `custom:${resolved}`, customCSS };
  }

  // Check if it's a built-in theme
  if (BUILTIN_THEMES.includes(resolved as BuiltinTheme)) {
    return { themeName: resolved };
  }

  // Treat as a direct CSS file path
  try {
    await access(resolved);
  } catch {
    throw new Error(
      `Unknown theme: "${resolved}". Use a built-in theme (${BUILTIN_THEMES.join(", ")}), ` +
      `a registered custom theme, or a path to a .css file.`
    );
  }

  // Validate and read direct CSS file
  await validateCssFile(resolved);
  const nameFromPath = sanitizeName(resolved);
  const customCSS = await readFile(resolved, "utf-8");

  return {
    themeName: `custom:${nameFromPath}`,
    customCSS,
  };
}
