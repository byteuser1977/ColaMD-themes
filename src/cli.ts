#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, isAbsolute, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import { UrlExtractor } from "./extractors/url-extractor.js";
import { DocxExtractor } from "./extractors/docx-extractor.js";
import { PdfExtractor } from "./extractors/pdf-extractor.js";
import type { Extractor } from "./extractors/base.js";
import { writeThemeFile } from "./generator.js";
import { COLOR_SYSTEMS, getColorSystem } from "./color-systems.js";
import { MERMAID_PRESETS } from "./mermaid-presets.js";
import { validateSeedPalette, summarizeIssues } from "./validators.js";
import type { ThemeStyle } from "./models.js";
import { registerExportCommands } from "./export-cli.js";
import { BUILTIN_THEMES } from "./theme-store.js";

/**
 * Dynamically read version from package.json to avoid hardcoding.
 * This ensures CLI --version always matches the published package version.
 */
function getPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkgPath = join(__dirname, "../package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Font stacks for each built-in theme — parsed dynamically from colamd.css. */
const THEME_FONTS: Record<string, string[]> = getBuiltinFontStacks();

/** Find the path to @bytechain.cn/colamd/dist/lib/colamd.css */
function findColamdCssPath(): string {
  const candidates = [
    resolve(dirname(new URL(import.meta.url).pathname), "../node_modules/@bytechain.cn/colamd/dist/lib/colamd.css"),
    resolve(process.cwd(), "node_modules/@bytechain.cn/colamd/dist/lib/colamd.css"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return "";
}

/**
 * Parse font-family values for each built-in theme from colamd.css.
 * Dynamic approach: reads `body.theme-{name} #editor .ProseMirror { font-family: ... }`
 * instead of hardcoding font stacks.
 */
function getBuiltinFontStacks(): Record<string, string[]> {
  const cssPath = findColamdCssPath();
  if (!cssPath) {
    // Fallback hardcoded defaults if colamd.css not found
    return {
      light: ["Noto Sans SC", "sans-serif"],
      dark: ["Noto Sans SC", "sans-serif"],
      elegant: ["LXGW WenKai", "Noto Serif SC", "serif"],
      newsprint: ["Noto Serif SC", "serif"],
    };
  }

  const css = readFileSync(cssPath, "utf-8");
  const result: Record<string, string[]> = {};
  const names = ["light", "dark", "elegant", "newsprint"];

  for (const theme of names) {
    // Match: body.theme-elegant #editor .ProseMirror { ... font-family: 'LXGW WenKai', ...; }
    const re = new RegExp(
      `body\\.theme-${theme}\\s+#editor\\s+\\.ProseMirror\\s*\\{[^}]*font-family:\\s*([^;]+)`,
      "i"
    );
    const m = css.match(re);
    if (m) {
      const fonts = m[1].split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "").trim());
      result[theme] = fonts;
    }
  }

  // Fill any missing themes with fallback
  for (const theme of names) {
    if (!result[theme]) {
      result[theme] = ["sans-serif"];
    }
  }

  return result;
}

/**
 * Check if a single font name is available on the system.
 * Multi-platform: fc-match (Linux/macOS/WSL), PowerShell registry (Windows),
 * system_profiler (macOS), universal directory scan fallback.
 */
function checkFont(fontName: string): string | null {
  // ── try fc-match first (Linux, WSL, macOS with fontconfig) ──
  try {
    const out = execSync(`fc-match "${fontName}" 2>/dev/null`, {
      encoding: "utf8",
      maxBuffer: 1024,
      shell: "/bin/sh",
    }).trim();
    if (out && !out.startsWith("fontconfig error")) {
      const parts = out.split(":").slice(1).join(":").trim();
      if (parts) return parts;
    }
  } catch {}

  // ── Windows: PowerShell registry query ──
  if (process.platform === "win32") {
    try {
      const safe = fontName.replace(/'/g, "''");
      const ps = `$n='${safe}';$p=Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' 2>$null;foreach($v in $p.PSObject.Properties){if($v.Value -like"*$n*"){Write-Output $v.Value;exit 0}}`;
      const out = execSync(
        `powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`,
        { encoding: "utf8", timeout: 5000 }
      ).trim();
      if (out && out !== "NOT_FOUND") return out;
    } catch {}
  }

  // ── macOS: system_profiler (slow but reliable) ──
  if (process.platform === "darwin") {
    try {
      const kw = fontName.toLowerCase();
      const out = execSync(
        `system_profiler SPFontsDataType 2>/dev/null | grep -i "${kw}"`,
        { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 10000 }
      ).trim();
      if (out) return out.split("\n")[0].trim();
    } catch {}
  }

  // ── Universal: scan known font directories ──
  const fontDirs: string[] = [];
  if (process.platform === "win32") {
    const sysRoot = process.env.SystemRoot || "C:\\Windows";
    fontDirs.push(join(sysRoot, "Fonts"));
  } else if (process.platform === "darwin") {
    const home = process.env.HOME || "";
    fontDirs.push("/Library/Fonts", "/System/Library/Fonts");
    if (home) fontDirs.push(join(home, "Library", "Fonts"));
  } else {
    // Linux / WSL
    fontDirs.push(
      "/usr/share/fonts",
      "/usr/local/share/fonts",
    );
    const home = process.env.HOME || "";
    if (home) fontDirs.push(join(home, ".local", "share", "fonts"));
  }

  const kw = fontName.replace(/[()\[\]]/g, "").split(/\s+/).filter(Boolean);
  if (kw.length === 0) return null;

  for (const dir of fontDirs) {
    if (!existsSync(dir)) continue;
    try {
      const files = readdirSync(dir, { recursive: true });
      const found = files.find((f) => {
        const lower = typeof f === "string" ? f.toLowerCase() : "";
        return /\.(ttf|ttc|otf|woff2?)$/i.test(lower) && kw.every((k) => lower.includes(k.toLowerCase()));
      });
      if (found) return typeof found === "string" ? found : String(found);
    } catch {}
  }

  return null;
}

/**
 * Parse unique font-family names from a CSS string.
 * Extracts font names from all `font-family: ...` declarations,
 * filters out CSS variable references (var(--...)).
 */
function parseFontsFromCSS(css: string): string[] {
  const names = new Set<string>();
  const isKeyword = /^(inherit|initial|unset|revert)$/i;
  // Match all font-family declarations
  const re = /font-family:\s*([^;{}]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    const value = match[1];
    // Split by comma, trim quotes, skip var() references
    for (const part of value.split(",")) {
      let name = part.trim().replace(/^['"]|['"]$/g, "").trim();
      // Strip !important, trailing semicolons
      name = name.replace(/\s*!important\s*$/i, "").trim();
      if (name && !name.startsWith("var(") && !isKeyword.test(name)) {
        names.add(name);
      }
    }
  }
  return Array.from(names);
}

let configCache: { themes: Record<string, string> } | null = null;

async function loadCustomThemes(): Promise<Record<string, string>> {
  if (configCache) return configCache.themes;
  try {
    const { getConfig } = await import("./theme-store.js");
    const config = await getConfig();
    configCache = config;
    return config.themes;
  } catch {
    return {};
  }
}

const program = new Command();

program
  .name("colamd-themes")
  .description("ColaMD Theme Development Tool — extract formatting and generate v3.0 paradigm CSS themes")
  .version(getPackageVersion());

// ── Shared extract options builder ──

function addExtractOptions(cmd: Command): Command {
  return cmd
    .option("-n, --name <name>", "Theme name")
    .option("-o, --output <path>", "Output CSS file path")
    .option("-d, --themes-dir <dir>", "Themes directory", "themes")
    .option("-c, --color-system <id>", "Force a color system (use `color-systems` to list)")
    .option("-m, --mermaid-preset <id>", "Force a Mermaid preset (light/dark/elegant)")
    .option("-A, --auto-match", "Auto-match color system and mermaid preset");
}

async function runExtraction(
  extractor: Extractor,
  source: string,
  options: Record<string, string>
) {
  const spinner = ora("Extracting styles...").start();
  try {
    const style = await extractor.extract(source);
    if (options.name) style.name = options.name;
    if (options.colorSystem) {
      const cs = getColorSystem(options.colorSystem);
      if (!cs) { spinner.fail(`Unknown color system: ${options.colorSystem}`); process.exit(1); }
      style.seed = { ...cs.palette };
      style.colorSystemId = cs.id;
    }
    if (options.mermaidPreset) style.mermaidPresetId = options.mermaidPreset;
    if (options.autoMatch) { style.colorSystemId = ""; style.mermaidPresetId = ""; }
    spinner.text = "Generating CSS (v3.0 paradigm)...";
    const outputPath = writeThemeFile(style, options.output || options.themesDir);
    spinner.succeed(chalk.green(`Theme "${style.name}" generated: ${outputPath}`));
    printSummary(style);
  } catch (err) {
    spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
    process.exit(1);
  }
}

// ── from-url ──
addExtractOptions(
  program.command("from-url")
    .description("Extract theme from a web page URL")
    .argument("<url>", "URL of the web page")
).action(async (url: string, options: Record<string, string>) => {
  await runExtraction(new UrlExtractor(), url, options);
});

// ── from-docx ──
addExtractOptions(
  program.command("from-docx")
    .description("Extract theme from a .docx document")
    .argument("<file>", "Path to the .docx file")
).action(async (file: string, options: Record<string, string>) => {
  if (!existsSync(file)) { console.error(chalk.red(`File not found: ${file}`)); process.exit(1); }
  await runExtraction(new DocxExtractor(), file, options);
});

// ── from-pdf ──
addExtractOptions(
  program.command("from-pdf")
    .description("Extract theme from a PDF document")
    .argument("<file>", "Path to the PDF file")
).action(async (file: string, options: Record<string, string>) => {
  if (!existsSync(file)) { console.error(chalk.red(`File not found: ${file}`)); process.exit(1); }
  await runExtraction(new PdfExtractor(), file, options);
});

// ── extract (auto-detect) ──
addExtractOptions(
  program.command("extract")
    .description("Auto-detect source type and extract theme")
    .argument("<source>", "URL, .docx file, or .pdf file")
).action(async (source: string, options: Record<string, string>) => {
  const extractors: Extractor[] = [new UrlExtractor(), new DocxExtractor(), new PdfExtractor()];
  const ext = extractors.find((e) => e.canHandle(source));
  if (!ext) { console.error(chalk.red(`Cannot detect source type for: ${source}`)); process.exit(1); }
  await runExtraction(ext, source, options);
});

// ── color-systems ──
program
  .command("color-systems")
  .description("List all 15 built-in color systems")
  .option("-j, --json", "Output as JSON")
  .action((options: Record<string, string>) => {
    if (options.json) { console.log(JSON.stringify(COLOR_SYSTEMS, null, 2)); return; }
    const families: Record<string, typeof COLOR_SYSTEMS> = {};
    for (const cs of COLOR_SYSTEMS) {
      const fam = cs.nameCN.split(" ")[0];
      (families[fam] ??= []).push(cs);
    }
    for (const [fam, systems] of Object.entries(families)) {
      console.log(chalk.bold(`\n${fam}`));
      for (const cs of systems) {
        console.log(`  ${chalk.cyan(cs.id.padEnd(24))} ${chalk.white(cs.nameCN.split(" ").slice(1).join(" "))}  ${chalk.dim(cs.palette.accent)}`);
      }
    }
    console.log();
  });

// ── mermaid-presets ──
program
  .command("mermaid-presets")
  .description("List Mermaid theme presets (light / dark / elegant)")
  .option("-j, --json", "Output as JSON")
  .action((options: Record<string, string>) => {
    if (options.json) { console.log(JSON.stringify(MERMAID_PRESETS, null, 2)); return; }
    for (const p of MERMAID_PRESETS) {
      console.log(`  ${chalk.cyan(p.id.padEnd(12))} ${chalk.white(p.name)}  ${chalk.dim(p.description)}`);
    }
    console.log();
  });

// ── list ──
program
  .command("list")
  .description("List all generated themes")
  .option("-d, --themes-dir <dir>", "Themes directory", "themes")
  .action((options: Record<string, string>) => {
    const dirPath = isAbsolute(options.themesDir) ? options.themesDir : join(process.cwd(), options.themesDir);
    if (!existsSync(dirPath)) { console.log(chalk.yellow(`No themes directory: ${dirPath}`)); return; }
    const files = readdirSync(dirPath).filter((f) => f.endsWith(".css"));
    if (files.length === 0) { console.log(chalk.yellow("No themes found.")); return; }
    console.log(chalk.bold(`\nThemes in ${dirPath}/:`));
    for (const f of files) console.log(`  ${chalk.cyan("●")} ${chalk.white(f.replace(".css", ""))}`);
    console.log(`\n${files.length} theme(s) total.\n`);
  });

// ── validate ──
program
  .command("validate")
  .description("Validate a theme CSS against v3.0 paradigm rules")
  .argument("<file>", "Path to theme CSS file")
  .action((file: string) => {
    if (!existsSync(file)) { console.error(chalk.red(`File not found: ${file}`)); process.exit(1); }
    const css = readFileSync(file, "utf-8");
    const extract = (name: string) => {
      const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
      return m ? m[1].trim() : "";
    };
    const seed = {
      accent: extract("--seed-accent"), accentLight: extract("--seed-accent-light"),
      accentDark: extract("--seed-accent-dark"), surface: extract("--seed-surface"),
      panel: extract("--seed-panel"), panelAlt: extract("--seed-panel-alt"),
      ink: extract("--seed-ink"), inkMuted: extract("--seed-ink-muted"),
      inkDim: extract("--seed-ink-dim"), border: extract("--seed-border"),
      borderStrong: extract("--seed-border-strong"),
    };
    if (!seed.accent) { console.error(chalk.yellow("Not a v3.0 paradigm theme (no seed palette found).")); process.exit(0); }
    console.log(chalk.bold("Seed palette:"));
    for (const [k, v] of Object.entries(seed)) console.log(`  ${chalk.dim(k.padEnd(18))} ${v}`);
    const issues = validateSeedPalette(seed);
    console.log(chalk.bold(`\nParadigm validation (${issues.length} issues):`));
    console.log(summarizeIssues(issues));
    if (issues.filter((i) => i.level === "MUST" || i.level === "MUST_NOT").length > 0) process.exit(1);
  });

// ── check-fonts ──
program
  .command("check-fonts")
  .description("Check whether built-in/custom theme fonts are installed on this system")
  .argument("[theme]", "Theme name (built-in, registered custom, or .css file path); omit to check all")
  .action(async (theme?: string) => {
    const customThemes = await loadCustomThemes();
    let fontSources: { name: string; fonts: string[] }[] = [];

    if (theme) {
      // 1. Check if it's a built-in theme
      if (BUILTIN_THEMES.includes(theme as any)) {
        fontSources.push({ name: theme, fonts: THEME_FONTS[theme] });
      }
      // 2. Check if it's a registered custom theme
      else if (customThemes[theme]) {
        const css = readFileSync(customThemes[theme], "utf-8");
        const fonts = parseFontsFromCSS(css);
        if (fonts.length === 0) {
          console.log(chalk.yellow(`  主题 "${theme}" 中未找到 font-family 声明`));
        }
        fontSources.push({ name: `${theme} (custom)`, fonts });
      }
      // 3. Treat as direct CSS file path
      else if (existsSync(theme) && theme.endsWith(".css")) {
        const css = readFileSync(theme, "utf-8");
        const fonts = parseFontsFromCSS(css);
        if (fonts.length === 0) {
          console.log(chalk.yellow(`  文件 ${theme} 中未找到 font-family 声明`));
        }
        fontSources.push({ name: theme, fonts });
      }
      // 4. Unknown
      else {
        console.error(chalk.red(`Unknown theme: "${theme}".\n  Built-in: ${BUILTIN_THEMES.join(", ")}\n  Registered: ${Object.keys(customThemes).join(", ") || "(none)"}`));
        process.exit(1);
      }
    } else {
      // No argument: built-in themes + all registered custom themes
      for (const t of Object.keys(THEME_FONTS)) {
        fontSources.push({ name: t, fonts: THEME_FONTS[t] });
      }
      for (const [name, cssPath] of Object.entries(customThemes)) {
        const css = readFileSync(cssPath, "utf-8");
        const fonts = parseFontsFromCSS(css);
        if (fonts.length > 0) {
          fontSources.push({ name: `${name} (custom)`, fonts });
        }
      }
    }

    console.log(chalk.bold("══ 主题字体检查 ══"));
    let total = 0;
    let missing = 0;

    for (const { name, fonts } of fontSources) {
      if (fonts.length === 0) continue;
      console.log(`\n  主题：${chalk.cyan(name)}`);
      for (const f of fonts) {
        total++;
        const result = checkFont(f);
        if (result) {
          console.log(`  ${chalk.green("✔")}  ${f} -> ${result}`);
        } else {
          console.log(`  ${chalk.red("✘")}  ${f} -> 未找到`);
          missing++;
        }
      }
    }

    console.log("");
    if (missing > 0) {
      console.log(`${chalk.yellow(`⚠ ${missing}/${total}`)} 个字体缺失，导出时可能回退到系统默认字体`);
      console.log("  建议安装：");
      if (process.platform === "win32") {
        console.log("    Windows: 从 https://github.com/lxgw/LxgwWenKai/releases 下载字体双击安装");
      } else if (process.platform === "darwin") {
        console.log("    brew install --cask font-lxgw-wenkai");
        console.log("    brew install --cask font-noto-serif-cjk-sc");
      } else {
        console.log("    sudo apt-get install -y fonts-noto-cjk-extra  # Linux/WSL");
      }
      process.exit(1);
    } else {
      console.log(chalk.green("✔ 所有主题字体检查通过"));
    }
  });

// ── Export commands (set-theme, export-html, export-pdf, export) ──
registerExportCommands(program);

// ── Summary ──

function printSummary(style: ThemeStyle): void {
  const s = style.seed;
  console.log(chalk.dim("\n  Seed palette:"));
  console.log(`  ${chalk.white("surface:")} ${s.surface}  ${chalk.white("ink:")} ${s.ink}  ${chalk.white("accent:")} ${s.accent}`);
  console.log(`  ${chalk.white("panel:")} ${s.panel}  ${chalk.white("panel-alt:")} ${s.panelAlt}`);
  if (style.colorSystemId) {
    console.log(chalk.dim(`  Color system: ${style.colorSystemId}  Mermaid: ${style.mermaidPresetId}`));
  }
}

export function main(): void { program.parse(); }
main();
