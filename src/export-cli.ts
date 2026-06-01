/**
 * Export CLI commands: set-theme, export-html, export-pdf, export (batch).
 *
 * These are registered onto the main Commander program in cli.ts.
 */

import { Command } from "commander";
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, isAbsolute, resolve, basename } from "node:path";
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

// ── set-theme ──

function registerSetTheme(program: Command): void {
  program
    .command("set-theme")
    .description("Set or register a theme for export")
    .argument("<name>", "Theme name (built-in or custom)")
    .option("--css <file>", "Register as custom theme using this CSS file")
    .option("--default", "Set as the default export theme")
    .option("--remove", "Unregister a custom theme")
    .action((name: string, options: { css?: string; default?: boolean; remove?: boolean }) => {
      // Remove
      if (options.remove) {
        if (storeUnregister(name)) {
          console.log(chalk.green(`✔ Unregistered custom theme "${name}"`));
        } else {
          console.log(chalk.yellow(`Theme "${name}" is not registered.`));
        }
        return;
      }

      // Register custom theme
      if (options.css) {
        const cssPath = isAbsolute(options.css) ? options.css : resolve(process.cwd(), options.css);
        if (!existsSync(cssPath)) {
          console.error(chalk.red(`CSS file not found: ${cssPath}`));
          process.exit(1);
        }
        storeRegister(name, cssPath);
        console.log(chalk.green(`✔ Registered custom theme "${name}" → ${cssPath}`));
        if (options.default) {
          storeSetDefault(name);
          console.log(chalk.green(`✔ Set "${name}" as default theme`));
        }
        return;
      }

      // Set as default (built-in or already registered)
      if (!BUILTIN_THEMES.includes(name as any)) {
        const config = getConfig();
        if (!(name in config.themes)) {
          console.error(
            chalk.red(`Unknown theme "${name}". `) +
            chalk.dim(`Built-in: ${BUILTIN_THEMES.join(", ")}. `) +
            chalk.dim("Or register a custom theme with --css <file>.")
          );
          process.exit(1);
        }
      }
      storeSetDefault(name);
      console.log(chalk.green(`✔ Default theme set to "${name}"`));

      // Show current config
      const config = getConfig();
      console.log(chalk.dim(`\n  Default: ${config.defaultTheme}`));
      const customs = Object.keys(config.themes);
      if (customs.length) {
        console.log(chalk.dim(`  Custom themes: ${customs.join(", ")}`));
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
      const inputPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
      if (!existsSync(inputPath)) {
        console.error(chalk.red(`File not found: ${inputPath}`));
        process.exit(1);
      }

      const md = readFileSync(inputPath, "utf-8");
      const title = basename(inputPath, ".md");
      const outputPath = options.output
        ? (isAbsolute(options.output) ? options.output : resolve(process.cwd(), options.output))
        : inputPath.replace(/\.md$/i, ".html");

      let theme;
      try {
        theme = resolveTheme(options.theme);
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      const spinner = ora(`Rendering ${basename(inputPath)} → HTML (${theme.themeName})...`).start();
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
      } catch (err) {
        spinner.fail(chalk.red(`Export failed: ${(err as Error).message}`));
        process.exit(1);
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
      const inputPath = isAbsolute(input) ? input : resolve(process.cwd(), input);
      if (!existsSync(inputPath)) {
        console.error(chalk.red(`File not found: ${inputPath}`));
        process.exit(1);
      }

      const md = readFileSync(inputPath, "utf-8");
      const title = basename(inputPath, ".md");
      const outputPath = options.output
        ? (isAbsolute(options.output) ? options.output : resolve(process.cwd(), options.output))
        : inputPath.replace(/\.md$/i, ".pdf");

      let theme;
      try {
        theme = resolveTheme(options.theme);
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      const spinner = ora(`Rendering ${basename(inputPath)} → PDF (${theme.themeName})...`).start();
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
      } catch (err) {
        spinner.fail(chalk.red(`Export failed: ${(err as Error).message}`));
        process.exit(1);
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
      // Resolve glob inputs (shell usually expands, but handle edge cases)
      const files: string[] = [];
      for (const input of inputs) {
        const p = isAbsolute(input) ? input : resolve(process.cwd(), input);
        if (existsSync(p)) {
          if (statSync(p).isDirectory()) {
            // Directory: include all .md files
            const dirFiles = readdirSync(p)
              .filter((f) => f.endsWith(".md"))
              .map((f) => join(p, f));
            files.push(...dirFiles);
          } else {
            files.push(p);
          }
        } else {
          console.log(chalk.yellow(`Skipping (not found): ${input}`));
        }
      }

      if (files.length === 0) {
        console.error(chalk.red("No valid input files found."));
        process.exit(1);
      }

      let theme;
      try {
        theme = resolveTheme(options.theme);
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      const outDir = isAbsolute(options.outputDir ?? ".")
        ? (options.outputDir ?? ".")
        : resolve(process.cwd(), options.outputDir ?? ".");
      const fmt = options.format ?? "html";

      // Ensure output directory exists
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

      console.log(chalk.bold(`\nBatch export: ${files.length} file(s) → ${fmt.toUpperCase()}`));
      console.log(chalk.dim(`  Theme: ${theme.themeName}`));
      console.log(chalk.dim(`  Output: ${outDir}/\n`));

      const renderer = new ColamdRenderer();
      let success = 0;
      let failed = 0;

      try {
        await renderer.init();

        for (const file of files) {
          const name = basename(file, ".md");
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
          } catch (err) {
            spinner.fail(`${name}.md — ${(err as Error).message}`);
            failed++;
          }
        }
      } finally {
        await renderer.close();
      }

      console.log(
        chalk.bold(`\nDone: ${chalk.green(`${success} exported`)}`) +
        (failed ? chalk.red(`, ${failed} failed`) : "") +
        "\n"
      );
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
