/**
 * Theme configuration persistence.
 *
 * Stores default theme and registered custom themes in ~/.colamd-themes/config.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".colamd-themes");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/** Built-in themes provided by @bytechain.cn/colamd */
export const BUILTIN_THEMES = ["light", "dark", "elegant", "newsprint"] as const;
export type BuiltinTheme = (typeof BUILTIN_THEMES)[number];

export interface ThemeConfig {
  /** Default theme name (built-in or custom) */
  defaultTheme: string;
  /** Registered custom themes: name → CSS file path */
  themes: Record<string, string>;
}

function readConfig(): ThemeConfig {
  if (!existsSync(CONFIG_FILE)) return { defaultTheme: "elegant", themes: {} };
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as ThemeConfig;
  } catch {
    return { defaultTheme: "elegant", themes: {} };
  }
}

function writeConfig(config: ThemeConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/** Get the full config. */
export function getConfig(): ThemeConfig {
  return readConfig();
}

/** Set the default theme (built-in name or registered custom name). */
export function setDefaultTheme(name: string): void {
  const config = readConfig();
  config.defaultTheme = name;
  writeConfig(config);
}

/**
 * Register a custom theme.
 * @param name  Unique name (will be prefixed with "custom:" when applied)
 * @param cssPath  Absolute path to the CSS file
 */
export function registerTheme(name: string, cssPath: string): void {
  const config = readConfig();
  config.themes[name] = cssPath;
  writeConfig(config);
}

/** Remove a registered custom theme. */
export function unregisterTheme(name: string): boolean {
  const config = readConfig();
  if (!(name in config.themes)) return false;
  delete config.themes[name];
  writeConfig(config);
  return true;
}

/**
 * Resolve a theme name to the arguments needed by the ColaMD renderer.
 *
 * @param name  Theme name. If omitted, uses the configured default.
 * @returns { themeName, customCSS? } — themeName is either a built-in name
 *          or "custom:<name>"; customCSS is the CSS content for custom themes.
 */
export function resolveTheme(name?: string): {
  themeName: string;
  customCSS?: string;
} {
  const config = readConfig();
  const resolved = name ?? config.defaultTheme;

  // Check if it's a registered custom theme
  if (config.themes[resolved]) {
    const cssPath = config.themes[resolved];
    if (!existsSync(cssPath)) {
      throw new Error(`Custom theme CSS file not found: ${cssPath}`);
    }
    return { themeName: `custom:${resolved}`, customCSS: readFileSync(cssPath, "utf-8") };
  }

  // Check if it's a built-in theme
  if (BUILTIN_THEMES.includes(resolved as BuiltinTheme)) {
    return { themeName: resolved };
  }

  // Treat as a direct CSS file path
  if (existsSync(resolved)) {
    const nameFromPath = resolved.replace(/\.css$/i, "").split("/").pop() ?? "custom";
    return {
      themeName: `custom:${nameFromPath}`,
      customCSS: readFileSync(resolved, "utf-8"),
    };
  }

  throw new Error(
    `Unknown theme: "${resolved}". Use a built-in theme (${BUILTIN_THEMES.join(", ")}), ` +
    `a registered custom theme, or a path to a .css file.`
  );
}
