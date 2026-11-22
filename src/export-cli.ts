/**
 * Export CLI commands: set-theme, export-html, export-pdf, export (batch).
 *
 * These are registered onto the main Commander program in cli.ts.
 * Uses unified error handling via CLIError and shared utility functions.
 */

import { Command } from "commander";
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import chalk from "chalk";
import {
  BUILTIN_THEMES,
  getConfig,
  setDefaultTheme as storeSetDefault,
  registerTheme as storeRegister,
  unregisterTheme as storeUnregister,
  resolveTheme,
} from "./theme-store.js";
import { ColamdRenderer, type RenderInput } from "./renderer.js";
import { getColamdCompat, formatColamdCompat } from "./compat.js";
import {
  resolveInputPath,
  resolveOutputPath,
  getDocumentTitle,
  CLIError,
  ErrorCode,
} from "./utils/cli-utils.js";
import { emit, startTask, formatFailures, formatWarnings, hasFailures } from "./utils/output.js";

// ── set-theme ──

function registerSetTheme(program: Command): void {
  program
    .command("set-theme")
    .description("Set or register a theme for export")
    .argument("<name>", "Theme name (built-in or custom)")
    .option("--css <file>", "Register as custom theme using this CSS file")
    .option("--default", "Set as the default export theme")
    .option("--remove", "Unregister a custom theme")
    .action(async (name: string, options: { css?: string; default?: boolean; remove?: boolean }) => {
      try {
        // Remove
        if (options.remove) {
          const removed = await storeUnregister(name);
          if (removed) {
            console.log(chalk.green(`✔ Unregistered custom theme "${name}"`));
          } else {
            console.log(chalk.yellow(`Theme "${name}" is not registered.`));
          }
          return;
        }

        // Register custom theme
        if (options.css) {
          const cssPath = resolveInputPath(options.css);
          await storeRegister(name, cssPath);
          console.log(chalk.green(`✔ Registered custom theme "${name}" → ${cssPath}`));
          if (options.default) {
            await storeSetDefault(name);
            console.log(chalk.green(`✔ Set "${name}" as default theme`));
          }
          return;
        }

        // Set as default (built-in or already registered)
        if (!BUILTIN_THEMES.includes(name as any)) {
          const config = await getConfig();
          if (!(name in config.themes)) {
            throw new CLIError(
              `Unknown theme "${name}". ` +
              chalk.dim(`Built-in: ${BUILTIN_THEMES.join(", ")}. `) +
              chalk.dim("Or register a custom theme with --css <file>."),
              ErrorCode.THEME_ERROR
            );
          }
        }

        await storeSetDefault(name);
        console.log(chalk.green(`✔ Default theme set to "${name}"`));

        // Show current config
        const config = await getConfig();
        console.log(chalk.dim(`\n  Default: ${config.defaultTheme}`));
        const customs = Object.keys(config.themes);
        if (customs.length) {
          console.log(chalk.dim(`  Custom themes: ${customs.join(", ")}`));
        }
      } catch (err) {
        if (err instanceof CLIError) {
          console.error(chalk.red(err.message));
          process.exit(err.code);
        } else {
          console.error(chalk.red(`Unexpected error: ${(err as Error).message}`));
          process.exit(ErrorCode.UNKNOWN);
        }
      }
    });
}

// ── export-html ──

function registerExportHTML(program: Command): void {
  program
    .command("export-html")
    .description("Export a Markdown file to standalone HTML with theme applied")
    .argument("<input>", "Path to .md file")
    .option("-t, --theme <name>", "Theme name (built-in, custom, or CSS file path)")
    .option("-o, --output <path>", "Output HTML file path")
    .option("--keep-fonts", "Keep inlined base64 math fonts (default strips them when the source has no math)", false)
    .option("--json", "Print a one-line JSON result")
    .option("--verbose", "Print detail lines")
    .action(async (input: string, options: { theme?: string; output?: string; keepFonts?: boolean; json?: boolean; verbose?: boolean }) => {
      try {
        // Resolve paths using shared utilities
        const inputPath = resolveInputPath(input);
        const title = getDocumentTitle(inputPath);
        const outputPath = resolveOutputPath(inputPath, options.output, ".html");

        // Read markdown content
        const md = readFileSync(inputPath, "utf-8");

        // Resolve theme with async API
        const theme = await resolveTheme(options.theme);

        // Render with progress indicator (silent when not a TTY / JSON mode)
        const task = startTask(`Rendering ${title} → HTML (${theme.themeName})...`, options);
        try {
          const { renderMarkdown } = await import("./renderer.js");
          const result = await renderMarkdown({
            markdown: md,
            themeName: theme.themeName,
            customCSS: theme.customCSS,
            title,
            optimize: !options.keepFonts,
          });

          writeFileSync(outputPath, result.html, "utf-8");
          task.succeed();
          emit(options, {
            ok: true,
            summary: `Exported: ${outputPath}`,
            data: { ok: true, output: outputPath, theme: theme.themeName, bytes: result.html.length },
          });
        } catch (renderErr) {
          task.fail();
          throw new CLIError(
            `HTML rendering failed: ${(renderErr as Error).message}`,
            ErrorCode.RENDER_ERROR,
            renderErr as Error
          );
        }
      } catch (err) {
        if (err instanceof CLIError) {
          emit(options, { ok: false, summary: err.message, exitCode: err.code });
        } else {
          emit(options, { ok: false, summary: (err as Error).message, exitCode: ErrorCode.FILE_NOT_FOUND });
        }
      }
    });
}

// ── export-pdf ──

function registerExportPDF(program: Command): void {
  program
    .command("export-pdf")
    .description("Export a Markdown file to PDF with theme applied")
    .argument("<input>", "Path to .md file")
    .option("-t, --theme <name>", "Theme name (built-in, custom, or CSS file path)")
    .option("-o, --output <path>", "Output PDF file path")
    .option("--format <size>", "Page format: A4, Letter, A3", "A4")
    .option("--keep-fonts", "Keep inlined base64 math fonts (default strips them when the source has no math)", false)
    .option("--json", "Print a one-line JSON result")
    .option("--verbose", "Print detail lines")
    .action(async (input: string, options: { theme?: string; output?: string; format?: string; keepFonts?: boolean; json?: boolean; verbose?: boolean }) => {
      try {
        // Resolve paths using shared utilities
        const inputPath = resolveInputPath(input);
        const title = getDocumentTitle(inputPath);
        const outputPath = resolveOutputPath(inputPath, options.output, ".pdf");

        // Read markdown content
        const md = readFileSync(inputPath, "utf-8");

        // Validate format option
        const validFormats = ["A4", "Letter", "A3"];
        if (!validFormats.includes(options.format ?? "")) {
          throw new CLIError(
            `Invalid page format: "${options.format}". Valid formats: ${validFormats.join(", ")}`,
            ErrorCode.INVALID_INPUT
          );
        }

        // Resolve theme with async API
        const theme = await resolveTheme(options.theme);

        // Render PDF with progress indicator
        const task = startTask(`Rendering ${title} → PDF (${theme.themeName})...`, options);
        try {
          const { renderPDF } = await import("./renderer.js");
          const pdfBuffer = await renderPDF(
            {
              markdown: md,
              themeName: theme.themeName,
              customCSS: theme.customCSS,
              title,
              optimize: !options.keepFonts,
            },
            { format: options.format as any }
          );

          writeFileSync(outputPath, pdfBuffer);

          // Artifact-side contract: content-check the produced PDF
          // (paper size / page count / blank pages / deck chrome).
          const { checkExportedPdf } = await import("./pdf-check.js");
          const isDeck = /<!--\s*(?:deck|slide[\s:])/.test(md);
          const check = await checkExportedPdf(pdfBuffer, isDeck ? { deckMd: md } : {});
          const pdfFailed = hasFailures(check.issues);
          const paper = check.paperSizes.map((s) => `${s.w.toFixed(0)}×${s.h.toFixed(0)}pt`).join(" / ") || "?";
          task.succeed();
          emit(options, {
            ok: !pdfFailed,
            summary: `Exported: ${outputPath} · ${check.pageCount} 页 · ${paper}${isDeck ? " · slide deck" : ""}${pdfFailed ? " · PDF 契约失败" : ""}`,
            details: [...formatFailures(check.issues), ...formatWarnings(check.issues)],
            data: {
              ok: !pdfFailed,
              output: outputPath,
              theme: theme.themeName,
              pages: check.pageCount,
              paper,
              issues: check.issues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })),
            },
            exitCode: pdfFailed ? 1 : 0,
          });
        } catch (renderErr) {
          task.fail();
          throw new CLIError(
            `PDF rendering failed: ${(renderErr as Error).message}`,
            ErrorCode.RENDER_ERROR,
            renderErr as Error
          );
        }
      } catch (err) {
        if (err instanceof CLIError) {
          emit(options, { ok: false, summary: err.message, exitCode: err.code });
        } else {
          emit(options, { ok: false, summary: (err as Error).message, exitCode: ErrorCode.FILE_NOT_FOUND });
        }
      }
    });
}

// ── export-slides ──

function registerExportSlides(program: Command): void {
  program
    .command("export-slides")
    .description("Export a slide-deck Markdown to a 16:9 PDF (ColaMD 2.7.13 slide layout)")
    .argument("<input>", "Path to a deck .md file (with <!-- deck ... --> or <!-- slide: ... -->)")
    .option("-t, --theme <name>", "Theme name (built-in, custom, or CSS file path)")
    .option("-o, --output <path>", "Output PDF file path (default: <input>.slides.pdf)")
    .option("--json", "Print a one-line JSON result")
    .option("--verbose", "Print detail lines")
    .action(async (input: string, options: { theme?: string; output?: string; json?: boolean; verbose?: boolean }) => {
      try {
        const inputPath = resolveInputPath(input);
        const md = readFileSync(inputPath, "utf-8");
        if (!/<!--\s*(?:deck|slide[\s:])/.test(md)) {
          throw new CLIError(
            "这份 Markdown 没有幻灯片指令（缺少 <!-- deck ... --> 或 <!-- slide: ... -->）。" +
            "先用 to-slides 或 ppt 生成 deck。",
            ErrorCode.INVALID_INPUT
          );
        }

        const compat = getColamdCompat();
        if (!compat.slidesExportSupported) {
          throw new CLIError(
            `当前平台不支持幻灯片 PDF 导出（需要 lib 暴露 enterSlidesPrintLayout/exitSlidesPrintLayout）。` +
            `${formatColamdCompat(compat)}；修复: npm install @bytechain.cn/colamd@^2.7.13`,
            ErrorCode.RENDER_ERROR
          );
        }

        const title = getDocumentTitle(inputPath);
        const outputPath = options.output
          ? resolve(process.cwd(), options.output)
          : /\.slides\.md$/i.test(inputPath)
            ? inputPath.replace(/\.md$/i, ".pdf")
            : inputPath.replace(/\.md$/i, ".slides.pdf");

        const theme = await resolveTheme(options.theme);
        const task = startTask(`Rendering ${title} → 16:9 PDF (${theme.themeName})...`, options);
        try {
          const { renderSlidesPDF } = await import("./renderer.js");
          const pdfBuffer = await renderSlidesPDF({
            markdown: md,
            themeName: theme.themeName,
            customCSS: theme.customCSS,
            title,
            slides: true,
          });
          writeFileSync(outputPath, pdfBuffer);

          const { checkExportedPdf } = await import("./pdf-check.js");
          const check = await checkExportedPdf(pdfBuffer, { deckMd: md, slides: true });
          const pdfFailed = hasFailures(check.issues);
          const paper = check.paperSizes.map((s) => `${s.w.toFixed(0)}×${s.h.toFixed(0)}pt`).join(" / ") || "?";
          task.succeed();
          emit(options, {
            ok: !pdfFailed,
            summary: `Exported: ${outputPath} · ${check.pageCount} 页 · ${paper} · slide deck${pdfFailed ? " · PDF 契约失败" : ""}`,
            details: [...formatFailures(check.issues), ...formatWarnings(check.issues)],
            data: {
              ok: !pdfFailed,
              output: outputPath,
              theme: theme.themeName,
              pages: check.pageCount,
              paper,
              issues: check.issues.map((i) => ({ rule: i.ruleId, level: i.level, message: i.message })),
            },
            exitCode: pdfFailed ? 1 : 0,
          });
        } catch (renderErr) {
          task.fail();
          throw new CLIError(
            `Slide PDF rendering failed: ${(renderErr as Error).message}`,
            ErrorCode.RENDER_ERROR,
            renderErr as Error
          );
        }
      } catch (err) {
        if (err instanceof CLIError) {
          emit(options, { ok: false, summary: err.message, exitCode: err.code });
        } else {
          emit(options, { ok: false, summary: (err as Error).message, exitCode: ErrorCode.UNKNOWN });
        }
      }
    });
}

// ── export (batch) ──

function registerExport(program: Command): void {
  program
    .command("export")
    .description("Batch export Markdown files to HTML or PDF")
    .argument("<inputs...>", "Paths to .md files (supports globs)")
    .option("--format <type>", "Output format: html or pdf", "html")
    .option("-t, --theme <name>", "Theme name")
    .option("-d, --output-dir <dir>", "Output directory", ".")
    .option("--keep-fonts", "Keep inlined base64 math fonts (default strips them when a source has no math)", false)
    .action(async (inputs: string[], options: { format?: string; theme?: string; outputDir?: string; keepFonts?: boolean }) => {
      try {
        // Resolve glob inputs (shell usually expands, but handle edge cases)
        const files: string[] = [];
        for (const input of inputs) {
          try {
            const p = resolveInputPath(input);
            if (statSync(p).isDirectory()) {
              // Directory: include all .md files
              const dirFiles = readdirSync(p)
                .filter((f) => f.endsWith(".md"))
                .map((f) => join(p, f));
              files.push(...dirFiles);
            } else {
              files.push(p);
            }
          } catch {
            console.log(chalk.yellow(`Skipping (not found): ${input}`));
          }
        }

        if (files.length === 0) {
          throw new CLIError("No valid input files found.", ErrorCode.FILE_NOT_FOUND);
        }

        // Resolve theme with async API
        const theme = await resolveTheme(options.theme);

        // Setup output directory
        const outDir = resolve(process.cwd(), options.outputDir ?? ".");
        // Support comma-separated formats ("html,pdf") so HTML+PDF share one
        // renderer/browser startup (rendering reuse optimization).
        const fmtList = (options.format ?? "html")
          .split(",")
          .map((f) => f.trim().toLowerCase())
          .filter(Boolean);
        const fmt = fmtList.join(",");

        if (fmtList.length === 0 || !fmtList.every((f) => ["html", "pdf"].includes(f))) {
          throw new CLIError(
            `Invalid format: "${options.format}". Supported formats: html, pdf (comma-separated)`,
            ErrorCode.INVALID_INPUT
          );
        }

        // Ensure output directory exists
        const { existsSync: dirExists } = await import("node:fs");
        if (!dirExists(outDir)) mkdirSync(outDir, { recursive: true });

        console.log(chalk.bold(`\nBatch export: ${files.length} file(s) → ${fmtList.map((f) => f.toUpperCase()).join(" + ")}`));
        console.log(chalk.dim(`  Theme: ${theme.themeName}`));
        console.log(chalk.dim(`  Output: ${outDir}/\n`));

        // Initialize renderer once for the whole batch (reuse across files AND
        // formats — a single browser/editor is shared for all HTML/PDF output).
        const renderer = new ColamdRenderer();
        let success = 0;
        let failed = 0;

        try {
          await renderer.init();

          for (const file of files) {
            const name = getDocumentTitle(file);
            const md = readFileSync(file, "utf-8");
            const task = startTask(`  ${name}.md`, {});

            try {
              const input: RenderInput = {
                markdown: md,
                themeName: theme.themeName,
                customCSS: theme.customCSS,
                title: name,
                optimize: !options.keepFonts,
              };
              const { writeFileSync } = await import("node:fs");

              for (const f of fmtList) {
                if (f === "pdf") {
                  const pdfBuffer = await renderer.exportPDF(input);
                  writeFileSync(join(outDir, `${name}.pdf`), pdfBuffer);
                } else {
                  const result = await renderer.render(input);
                  writeFileSync(join(outDir, `${name}.html`), result.html, "utf-8");
                }
              }

              task.succeed(`${name}.${fmtList.map((f) => (f === "pdf" ? "pdf" : "html")).join("+")}`);
              success++;
            } catch (fileErr) {
              task.fail(`${name}.md — ${(fileErr as Error).message}`);
              failed++;
            }
          }
        } finally {
          await renderer.close();
        }

        // Summary
        console.log(
          chalk.bold(`\nDone: ${chalk.green(`${success} exported`)}`) +
          (failed ? chalk.red(`, ${failed} failed`) : "") +
          "\n"
        );

        if (failed > 0) {
          throw new CLIError(
            `${failed} file(s) failed to export`,
            ErrorCode.RENDER_ERROR
          );
        }
      } catch (err) {
        if (err instanceof CLIError) {
          console.error(chalk.red(err.message));
          process.exit(err.code);
        } else {
          console.error(chalk.red((err as Error).message));
          process.exit(ErrorCode.UNKNOWN);
        }
      }
    });
}

/**
 * Register all export-related commands onto the program.
 */
export function registerExportCommands(program: Command): void {
  registerSetTheme(program);
  registerExportHTML(program);
  registerExportPDF(program);
  registerExportSlides(program);
  registerExport(program);
}
