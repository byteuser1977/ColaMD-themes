/**
 * Export CLI commands: set-theme, export-html, export-pdf, export (batch).
 *
 * These are registered onto the main Commander program in cli.ts.
 * Uses unified error handling via CLIError and shared utility functions.
 */

import { Command } from "commander";
import { readFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import chalk from "chalk";
import ora from "ora";
import {
  BUILTIN_THEMES,
  getConfig,
  setDefaultTheme as storeSetDefault,
  registerTheme as storeRegister,
  unregisterTheme as storeUnregister,
  resolveTheme,
} from "./theme-store.js";
import { ColamdRenderer, type RenderInput } from "./renderer.js";
import {
  resolveInputPath,
  resolveOutputPath,
  getDocumentTitle,
  CLIError,
  ErrorCode,
} from "./utils/cli-utils.js";

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
    .action(async (input: string, options: { theme?: string; output?: string }) => {
      try {
        // Resolve paths using shared utilities
        const inputPath = resolveInputPath(input);
        const title = getDocumentTitle(inputPath);
        const outputPath = resolveOutputPath(inputPath, options.output, ".html");

        // Read markdown content
        const md = readFileSync(inputPath, "utf-8");

        // Resolve theme with async API
        const theme = await resolveTheme(options.theme);

        // Render with progress indicator
        const spinner = ora(`Rendering ${title} → HTML (${theme.themeName})...`).start();
        try {
          const { renderMarkdown } = await import("./renderer.js");
          const result = await renderMarkdown({
            markdown: md,
            themeName: theme.themeName,
            customCSS: theme.customCSS,
            title,
          });

          const { writeFileSync } = await import("node:fs");
          writeFileSync(outputPath, result.html, "utf-8");
          spinner.succeed(chalk.green(`Exported: ${outputPath}`));
        } catch (renderErr) {
          spinner.fail(chalk.red(`Export failed: ${(renderErr as Error).message}`));
          throw new CLIError(
            `HTML rendering failed: ${(renderErr as Error).message}`,
            ErrorCode.RENDER_ERROR,
            renderErr as Error
          );
        }
      } catch (err) {
        if (err instanceof CLIError) {
          process.exit(err.code);
        } else {
          console.error(chalk.red((err as Error).message));
          process.exit(ErrorCode.FILE_NOT_FOUND);
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
    .action(async (input: string, options: { theme?: string; output?: string; format?: string }) => {
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
        const spinner = ora(`Rendering ${title} → PDF (${theme.themeName})...`).start();
        try {
          const { renderPDF } = await import("./renderer.js");
          const pdfBuffer = await renderPDF(
            {
              markdown: md,
              themeName: theme.themeName,
              customCSS: theme.customCSS,
              title,
            },
            { format: options.format as any }
          );

          const { writeFileSync } = await import("node:fs");
          writeFileSync(outputPath, pdfBuffer);
          spinner.succeed(chalk.green(`Exported: ${outputPath}`));
        } catch (renderErr) {
          spinner.fail(chalk.red(`Export failed: ${(renderErr as Error).message}`));
          throw new CLIError(
            `PDF rendering failed: ${(renderErr as Error).message}`,
            ErrorCode.RENDER_ERROR,
            renderErr as Error
          );
        }
      } catch (err) {
        if (err instanceof CLIError) {
          process.exit(err.code);
        } else {
          console.error(chalk.red((err as Error).message));
          process.exit(ErrorCode.FILE_NOT_FOUND);
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
    .action(async (inputs: string[], options: { format?: string; theme?: string; outputDir?: string }) => {
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
        const fmt = options.format ?? "html";

        if (!["html", "pdf"].includes(fmt)) {
          throw new CLIError(
            `Invalid format: "${fmt}". Supported formats: html, pdf`,
            ErrorCode.INVALID_INPUT
          );
        }

        // Ensure output directory exists
        const { existsSync: dirExists } = await import("node:fs");
        if (!dirExists(outDir)) mkdirSync(outDir, { recursive: true });

        console.log(chalk.bold(`\nBatch export: ${files.length} file(s) → ${fmt.toUpperCase()}`));
        console.log(chalk.dim(`  Theme: ${theme.themeName}`));
        console.log(chalk.dim(`  Output: ${outDir}/\n`));

        // Initialize renderer for batch processing
        const renderer = new ColamdRenderer();
        let success = 0;
        let failed = 0;

        try {
          await renderer.init();

          for (const file of files) {
            const name = getDocumentTitle(file);
            const md = readFileSync(file, "utf-8");
            const outPath = join(outDir, `${name}.${fmt === "pdf" ? "pdf" : "html"}`);
            const spinner = ora(`  ${name}.md`).start();

            try {
              const input: RenderInput = {
                markdown: md,
                themeName: theme.themeName,
                customCSS: theme.customCSS,
                title: name,
              };

              if (fmt === "pdf") {
                const pdfBuffer = await renderer.exportPDF(input);
                const { writeFileSync } = await import("node:fs");
                writeFileSync(outPath, pdfBuffer);
              } else {
                const result = await renderer.render(input);
                const { writeFileSync } = await import("node:fs");
                writeFileSync(outPath, result.html, "utf-8");
              }

              spinner.succeed(`${name}.${fmt === "pdf" ? "pdf" : "html"}`);
              success++;
            } catch (fileErr) {
              spinner.fail(`${name}.md — ${(fileErr as Error).message}`);
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
  registerExport(program);
}
