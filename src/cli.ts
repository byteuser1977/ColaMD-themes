#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, isAbsolute, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import chalk from "chalk";
import { UrlExtractor } from "./extractors/url-extractor.js";
import { LocalHtmlExtractor } from "./extractors/local-html.js";
import { DocxExtractor } from "./extractors/docx-extractor.js";
import { PdfExtractor } from "./extractors/pdf-extractor.js";
import type { Extractor } from "./extractors/base.js";
import { writeThemeFile } from "./generator.js";
import { COLOR_SYSTEMS, getColorSystem } from "./color-systems.js";
import { validateSeedPalette, validateThemeCss, summarizeIssues, parseIssueWaivers } from "./validators.js";
import type { ThemeStyle } from "./models.js";
import { registerExportCommands } from "./export-cli.js";
import { BUILTIN_THEMES, resolveTheme } from "./theme-store.js";
import { getColamdCompat, formatColamdCompat } from "./compat.js";
import { markdownToSlides, validateSlidesMarkdown } from "./slides-markdown.js";
import { emit, startTask, formatFailures, formatWarnings, hasFailures } from "./utils/output.js";

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

/** Fallback stacks used when colamd.css is missing or a theme rule can't be parsed. */
const BUILTIN_FONT_FALLBACKS: Record<string, string[]> = {
  light: ["Noto Sans SC", "sans-serif"],
  dark: ["Noto Sans SC", "sans-serif"],
  elegant: ["LXGW WenKai", "Noto Serif SC", "serif"],
  newsprint: ["Noto Serif SC", "serif"],
};

/** Font stacks for each built-in theme — parsed dynamically from colamd.css. */
const THEME_FONTS: Record<string, string[]> = getBuiltinFontStacks();

/** Find the path to @bytechain.cn/colamd/dist/lib/colamd.css */
function findColamdCssPath(): string {
  const moduleDir = fileURLToPath(new URL("../node_modules/@bytechain.cn/colamd/dist/lib", import.meta.url));
  const candidates = [
    resolve(moduleDir, "colamd.css"),
    resolve(process.cwd(), "node_modules/@bytechain.cn/colamd/dist/lib/colamd.css"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return "";
}

/**
 * Parse font-family values for each built-in theme from colamd.css.
 * Dynamic approach: reads `body.theme-{name} ... .cm-content { font-family: ... }`
 * instead of hardcoding font stacks.
 */
function getBuiltinFontStacks(): Record<string, string[]> {
  const result: Record<string, string[]> = { ...BUILTIN_FONT_FALLBACKS };
  const cssPath = findColamdCssPath();
  if (!cssPath) return result;

  const css = readFileSync(cssPath, "utf-8");

  for (const theme of Object.keys(BUILTIN_FONT_FALLBACKS)) {
    // 2.7 契约：字体栈写在 .cm-content 上（CodeMirror 6 不再有 .ProseMirror）
    const re = new RegExp(
      `body\\.theme-${theme}[^{]*\\.cm-content[^{]*\\{[^}]*font-family:\\s*([^;]+)`,
      "i"
    );
    const m = css.match(re);
    if (!m || m[1].includes("var(")) continue;

    const fonts = m[1]
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, "").trim())
      .filter(Boolean);
    if (fonts.length > 0) result[theme] = fonts;
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
  .description("ColaMD Theme Development Tool — extract formatting and generate 2.7-contract CSS themes")
  .version(getPackageVersion());

// ── Shared extract options builder ──

function addExtractOptions(cmd: Command): Command {
  return cmd
    .option("-n, --name <name>", "Theme name")
    .option("-o, --output <path>", "Output CSS file path")
    .option("-d, --themes-dir <dir>", "Themes directory", "themes")
    .option("-c, --color-system <id>", "Force a color system (use `color-systems` to list)")
    .option("-A, --auto-match", "Auto-match a color system from the extracted palette")
    .option("--ppt [style]", "Also emit PPT --slide-* tokens (ColaMD 2.7.13+ slides); optional preset: serif|sans|mono");
}

async function runExtraction(
  extractor: Extractor,
  source: string,
  options: Record<string, string>
) {
  const spinner = startTask("Extracting styles...", {});
  try {
    // --ppt [serif|sans|mono]: validate the preset before running extraction.
    // 显式指定预设时提前校验；无值 flag 则信任提取器自带的 slidePreset（如按模板字体自动判定）。
    let slidePreset: "serif" | "sans" | "mono" | undefined;
    if (typeof options.ppt === "string") {
      const { parseSlidePreset } = await import("./slides.js");
      const preset = parseSlidePreset(options.ppt);
      if (!preset) {
        spinner.fail(chalk.red(`Unknown PPT preset: "${options.ppt}". Valid presets: serif, sans, mono`));
        process.exit(1);
      }
      slidePreset = preset;
    }
    const style = await extractor.extract(source);
    if (options.name) style.name = options.name;
    if (slidePreset) style.slidePreset = slidePreset;
    else if (options.ppt && !style.slidePreset) style.slidePreset = "serif";
    if (options.colorSystem) {
      const cs = getColorSystem(options.colorSystem);
      if (!cs) { spinner.fail(`Unknown color system: ${options.colorSystem}`); process.exit(1); }
      style.seed = { ...cs.palette };
      style.colorSystemId = cs.id;
    }
    if (options.autoMatch) style.colorSystemId = "";
    spinner.setText("Generating CSS (2.8.0 contract)...");
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

// ── from-html ──
addExtractOptions(
  program.command("from-html")
    .description("Extract theme from a local HTML file (uses sibling template.json as metadata when present)")
    .argument("<file>", "Path to the .html file")
).action(async (file: string, options: Record<string, string | boolean>) => {
  if (!existsSync(file)) { console.error(chalk.red(`File not found: ${file}`)); process.exit(1); }
  await runExtraction(new LocalHtmlExtractor(), file, options as Record<string, string>);
});

// ── extract (auto-detect) ──
addExtractOptions(
  program.command("extract")
    .description("Auto-detect source type and extract theme")
    .argument("<source>", "URL, .html file, .docx file, or .pdf file")
).action(async (source: string, options: Record<string, string>) => {
  const extractors: Extractor[] = [new LocalHtmlExtractor(), new UrlExtractor(), new DocxExtractor(), new PdfExtractor()];
  const ext = extractors.find((e) => e.canHandle(source));
  if (!ext) { console.error(chalk.red(`Cannot detect source type for: ${source}`)); process.exit(1); }
  await runExtraction(ext, source, options);
});

// ── to-slides ──
program
  .command("to-slides")
  .description("Convert a Markdown document into slide-deck Markdown (ColaMD 2.7.13+ slide layouts)")
  .argument("<input>", "Path to .md file")
  .option("-o, --output <path>", "Output .md file path (default: <input>.slides.md)")
  .option("--deck-brand <text>", "Deck chrome brand (footer-left serif text)")
  .option("--deck-title <text>", "Deck chrome title (overrides frontmatter/first h1)")
  .option("--deck-meta <text>", "Deck chrome meta (chrome-right fallback, e.g. date)")
  .option("--deck-logo <path>", "Deck chrome logo path (relative to the output file)")
  .option("--no-adapt", "Do not adapt page content to the layout contracts (default: adapt)")
  .option("--json", "Print a one-line JSON result")
  .option("--verbose", "Print detail lines")
  .action((input: string, options: {
    output?: string; deckBrand?: string; deckTitle?: string; deckMeta?: string; deckLogo?: string;
    adapt?: boolean; json?: boolean; verbose?: boolean;
  }) => {
    if (!existsSync(input)) { console.error(chalk.red(`File not found: ${input}`)); process.exit(1); }
    const md = readFileSync(input, "utf-8");
    const slides = markdownToSlides(md, {
      brand: options.deckBrand,
      title: options.deckTitle,
      meta: options.deckMeta,
      logo: options.deckLogo,
      adapt: options.adapt !== false,
    });

    // Self-check the generated deck against the directive + content contracts.
    const issues = validateSlidesMarkdown(slides);
    const failed = hasFailures(issues);

    const outputPath = options.output || input.replace(/\.md$/i, "") + ".slides.md";
    writeFileSync(outputPath, slides, "utf-8");
    const pageCount = slides.split("\n").filter((l) => /^ {0,3}---\s*$/.test(l)).length + 1;

    emit({ json: options.json, verbose: options.verbose }, {
      ok: !failed,
      summary: `Slides deck: ${outputPath} (${pageCount} pages)${failed ? " · 契约失败" : ""}`,
      details: [...formatFailures(issues), ...formatWarnings(issues)],
      data: {
        ok: !failed,
        output: outputPath,
        pages: pageCount,
        issues: issues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })),
      },
    });
  });

// ── ppt (one-shot deck generation + 16:9 PDF) ──
program
  .command("ppt")
  .description("One-shot: markdown → slide-deck markdown → validated 16:9 PDF (ColaMD 2.7.13+ slides)")
  .argument("<input>", "Path to the source .md file")
  .option("-t, --theme <name>", "Theme name (built-in, custom, or CSS file path)")
  .option("-d, --output-dir <dir>", "Output directory (default: alongside the input)")
  .option("--deck-brand <text>", "Deck chrome brand")
  .option("--deck-title <text>", "Deck chrome title")
  .option("--deck-meta <text>", "Deck chrome meta (e.g. date)")
  .option("--deck-logo <path>", "Deck chrome logo path")
  .option("--no-adapt", "Do not adapt page content to the layout contracts")
  .option("--md-only", "Stop after writing the deck markdown (skip the PDF)")
  .option("--json", "Print a one-line JSON result")
  .option("--verbose", "Print detail lines")
  .action(async (input: string, options: {
    theme?: string; outputDir?: string; deckBrand?: string; deckTitle?: string; deckMeta?: string;
    deckLogo?: string; adapt?: boolean; mdOnly?: boolean; json?: boolean; verbose?: boolean;
  }) => {
    const out = { json: options.json, verbose: options.verbose };
    if (!existsSync(input)) { console.error(chalk.red(`File not found: ${input}`)); process.exit(1); }

    try {
      const inputPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
      const base = basename(inputPath, ".md");
      const outDir = options.outputDir ? resolve(process.cwd(), options.outputDir) : dirname(inputPath);
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      const mdPath = join(outDir, `${base}.slides.md`);
      const pdfPath = join(outDir, `${base}.slides.pdf`);

      const task = startTask(`Generating deck from ${base}.md...`, out);
      const source = readFileSync(inputPath, "utf-8");
      const slides = markdownToSlides(source, {
        brand: options.deckBrand,
        title: options.deckTitle,
        meta: options.deckMeta,
        logo: options.deckLogo,
        adapt: options.adapt !== false,
      });
      writeFileSync(mdPath, slides, "utf-8");

      const deckIssues = validateSlidesMarkdown(slides);
      if (hasFailures(deckIssues)) {
        task.fail();
        emit(out, {
          ok: false,
          summary: `Deck 契约失败，已停止导出：${mdPath}`,
          details: [...formatFailures(deckIssues), ...formatWarnings(deckIssues)],
          data: { ok: false, markdown: mdPath, issues: deckIssues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })) },
          exitCode: 1,
        });
        return;
      }

      const pages = slides.split("\n").filter((l) => /^ {0,3}---\s*$/.test(l)).length + 1;
      if (options.mdOnly) {
        task.succeed();
        emit(out, {
          ok: true,
          summary: `PPT Markdown: ${mdPath} (${pages} pages)`,
          details: formatWarnings(deckIssues),
          data: { ok: true, markdown: mdPath, pages, issues: deckIssues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })) },
        });
        return;
      }

      // Fail fast with an actionable message when the installed platform's lib
      // entry predates the slide export API (2.7.13 line and older).
      const compat = getColamdCompat();
      if (!compat.slidesExportSupported) {
        task.fail();
        emit(out, {
          ok: false,
          summary: "当前 @bytechain.cn/colamd 不支持幻灯片 PDF 导出",
          details: [
            `  ${formatColamdCompat(compat)}`,
            `  修复: npm install @bytechain.cn/colamd@^${compat.version ?? "2.8.0"}（需 lib 暴露 enterSlidesPrintLayout/exitSlidesPrintLayout）`,
          ],
          data: { ok: false, markdown: mdPath, error: "slides-export-unsupported", compat: formatColamdCompat(compat) },
          exitCode: 1,
        });
        return;
      }

      const theme = await resolveTheme(options.theme);
      task.setText(`Rendering ${pages} pages → 16:9 PDF (${theme.themeName})...`);
      const { renderSlidesPDF } = await import("./renderer.js");
      const pdfBuffer = await renderSlidesPDF({
        markdown: slides,
        themeName: theme.themeName,
        customCSS: theme.customCSS,
        title: options.deckTitle || base,
        slides: true,
      });
      writeFileSync(pdfPath, pdfBuffer);

      const { checkExportedPdf } = await import("./pdf-check.js");
      const check = await checkExportedPdf(pdfBuffer, { deckMd: slides, slides: true });
      const pdfFailed = hasFailures(check.issues);
      task.succeed();
      emit(out, {
        ok: !pdfFailed,
        summary: `PPT: ${mdPath} + ${pdfPath} · ${check.pageCount} 页 · ${theme.themeName}${pdfFailed ? " · PDF 契约失败" : ""}`,
        details: [...formatFailures(check.issues), ...formatWarnings(check.issues), ...formatWarnings(deckIssues)],
        data: {
          ok: !pdfFailed,
          markdown: mdPath,
          pdf: pdfPath,
          pages,
          pdfPages: check.pageCount,
          paper: check.paperSizes.map((s) => `${s.w.toFixed(0)}×${s.h.toFixed(0)}pt`).join(" / "),
          theme: theme.themeName,
          issues: check.issues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })),
        },
        exitCode: pdfFailed ? 1 : 0,
      });
    } catch (err) {
      emit(out, {
        ok: false,
        summary: `PPT 导出失败: ${(err as Error).message}`,
        exitCode: 1,
      });
    }
  });

// ── check-pdf ──
program
  .command("check-pdf")
  .description("Content-check an exported PDF (paper size, page count, blank pages, deck chrome)")
  .argument("<file>", "Path to exported .pdf")
  .option("-d, --deck <md>", "Companion deck markdown (enables page-count & chrome checks)")
  .option("--json", "Print a one-line JSON result")
  .option("--verbose", "Print detail lines")
  .action(async (file: string, options: { deck?: string; json?: boolean; verbose?: boolean }) => {
    if (!existsSync(file)) { console.error(chalk.red(`File not found: ${file}`)); process.exit(1); }
    const { checkExportedPdf } = await import("./pdf-check.js");
    const buffer = readFileSync(file);
    const deckMd = options.deck && existsSync(options.deck) ? readFileSync(options.deck, "utf-8") : undefined;
    const check = await checkExportedPdf(buffer, { deckMd });
    const failed = hasFailures(check.issues);
    const paper = check.paperSizes.map((s) => `${s.w.toFixed(0)}×${s.h.toFixed(0)}pt`).join(" / ") || "?";
    emit({ json: options.json, verbose: options.verbose }, {
      ok: !failed,
      summary: `${file}: ${failed ? "PDF 内容契约失败" : "PDF-01~05 内容契约通过"} · ${check.pageCount} 页 · ${paper}`,
      details: [...formatFailures(check.issues), ...formatWarnings(check.issues)],
      data: {
        ok: !failed,
        file,
        pages: check.pageCount,
        paper,
        issues: check.issues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })),
      },
    });
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
  .description("Validate a theme CSS (2.8.0 contract + slide tokens) or slides markdown (directive + content contract)")
  .argument("<file>", "Path to a .css theme file or a .md slides file")
  .option("--json", "Print a one-line JSON result")
  .option("--verbose", "Print the full validation report")
  .action((file: string, options: { json?: boolean; verbose?: boolean }) => {
    if (!existsSync(file)) { console.error(chalk.red(`File not found: ${file}`)); process.exit(1); }
    const css = readFileSync(file, "utf-8");

    // Slides markdown: directive + layout-content contract checks.
    if (file.toLowerCase().endsWith(".md")) {
      const issues = validateSlidesMarkdown(css);
      const failed = hasFailures(issues);
      const compatLine = formatColamdCompat();
      if (options.verbose && !options.json) {
        console.log(chalk.bold("Slides directives (ColaMD 2.7.13+):"));
        console.log(issues.length === 0
          ? chalk.green("  ✔ 指令语法、页首规则、内容契约与 slide-css 白名单校验通过")
          : summarizeIssues(issues));
        if (failed) process.exitCode = 1;
        return;
      }
      emit({ json: options.json, verbose: options.verbose }, {
        ok: !failed,
        summary: `${file}: ${failed ? `指令/内容契约失败（${issues.filter((i) => i.level === "MUST" || i.level === "MUST_NOT").length} 项）` : "指令与内容契约通过"} · ${compatLine}`,
        details: [...formatFailures(issues), ...formatWarnings(issues)],
        data: { ok: !failed, file, issues: issues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })) },
      });
      return;
    }

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
    const cssIssues = validateThemeCss(css);
    const seedIssues = seed.accent ? validateSeedPalette(seed) : [];
    const allIssues = [...cssIssues, ...seedIssues];
    const waivers = parseIssueWaivers(css);
    const issues = allIssues.filter((i) => !waivers.has(i.ruleId));
    const waived = [...new Set(allIssues.filter((i) => waivers.has(i.ruleId)).map((i) => i.ruleId))];
    const failed = hasFailures(issues);
    const compat = getColamdCompat();
    const compatLine = formatColamdCompat(compat);

    if (options.verbose && !options.json) {
      console.log(chalk.bold("CSS contract (ColaMD 2.8.0):"));
      console.log(cssIssues.filter((i) => !waivers.has(i.ruleId)).length === 0 ? chalk.green("  ✔ :root 根块与选择器契约通过") : summarizeIssues(cssIssues.filter((i) => !waivers.has(i.ruleId))));
      console.log(compat.status === "exact" ? chalk.dim(`  平台兼容: ${compatLine}`) : chalk.yellow(`  平台兼容: ${compatLine}`));
      if (waived.length > 0) console.log(chalk.dim(`  已备案豁免: ${waived.join(", ")}（文件头 colamd-allow）`));
      if (!seed.accent) {
        console.log(chalk.yellow("\nNot a seed-palette theme (no --seed-* found); seed checks skipped."));
        if (failed) process.exitCode = 1;
        return;
      }
      console.log(chalk.bold("\nSeed palette:"));
      for (const [k, v] of Object.entries(seed)) console.log(`  ${chalk.dim(k.padEnd(18))} ${v}`);
      const activeSeed = seedIssues.filter((i) => !waivers.has(i.ruleId));
      console.log(chalk.bold(`\nParadigm validation (${activeSeed.length} issues):`));
      console.log(summarizeIssues(activeSeed));
      if (failed) process.exitCode = 1;
      return;
    }

    emit({ json: options.json, verbose: options.verbose }, {
      ok: !failed,
      summary: `${file}: ${failed ? `CSS 契约失败（${issues.filter((i) => i.level === "MUST" || i.level === "MUST_NOT").length} 项）` : "CSS 契约通过"} · ${compatLine}`,
      details: [...formatFailures(issues), ...formatWarnings(issues)],
      data: {
        ok: !failed,
        file,
        compat: compatLine,
        issues: issues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })),
        ...(waived.length > 0 ? { waived } : {}),
      },
    });
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
    console.log(chalk.dim(`  Color system: ${style.colorSystemId}`));
  }
  if (style.slidePreset) {
    console.log(chalk.dim(`  PPT style: ${style.slidePreset} (--slide-* tokens emitted)`));
  }
}

export function main(): void { program.parse(); }
main();
