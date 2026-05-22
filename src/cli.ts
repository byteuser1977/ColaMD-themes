#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";
import ora from "ora";
import { UrlExtractor } from "./extractors/url-extractor.js";
import { DocxExtractor } from "./extractors/docx-extractor.js";
import { PdfExtractor } from "./extractors/pdf-extractor.js";
import type { Extractor } from "./extractors/base.js";
import { writeThemeFile } from "./generator.js";
import { makeThemeStyle } from "./models.js";

const program = new Command();

program
  .name("colamd-themes")
  .description("ColaMD Theme Development Tool — extract formatting from URLs, DOCX, PDF and generate CSS theme files")
  .version("0.1.0");

program
  .command("from-url")
  .description("Extract theme from a web page URL")
  .argument("<url>", "URL of the web page to extract styles from")
  .option("-n, --name <name>", "Theme name (derived from page title if omitted)")
  .option("-o, --output <path>", "Output CSS file path (default: themes/<name>.css)")
  .option("-d, --themes-dir <dir>", "Themes directory", "themes")
  .action(async (url: string, options: Record<string, string>) => {
    const spinner = ora("Fetching page and extracting styles...").start();
    try {
      const extractor = new UrlExtractor();
      const style = await extractor.extract(url);
      if (options.name) style.name = options.name;
      spinner.text = "Generating CSS...";
      const outputPath = writeThemeFile(style, options.output || options.themesDir);
      spinner.succeed(chalk.green(`Theme "${style.name}" generated: ${outputPath}`));
      printSummary(style);
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("from-docx")
  .description("Extract theme from a .docx document")
  .argument("<file>", "Path to the .docx file")
  .option("-n, --name <name>", "Theme name (derived from filename if omitted)")
  .option("-o, --output <path>", "Output CSS file path")
  .option("-d, --themes-dir <dir>", "Themes directory", "themes")
  .action(async (file: string, options: Record<string, string>) => {
    const spinner = ora("Parsing DOCX document...").start();
    try {
      if (!existsSync(file)) {
        spinner.fail(`File not found: ${file}`);
        process.exit(1);
      }
      const extractor = new DocxExtractor();
      const style = await extractor.extract(file);
      if (options.name) style.name = options.name;
      spinner.text = "Generating CSS...";
      const outputPath = writeThemeFile(style, options.output || options.themesDir);
      spinner.succeed(chalk.green(`Theme "${style.name}" generated: ${outputPath}`));
      printSummary(style);
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("from-pdf")
  .description("Extract theme from a PDF document")
  .argument("<file>", "Path to the PDF file")
  .option("-n, --name <name>", "Theme name (derived from filename if omitted)")
  .option("-o, --output <path>", "Output CSS file path")
  .option("-d, --themes-dir <dir>", "Themes directory", "themes")
  .action(async (file: string, options: Record<string, string>) => {
    const spinner = ora("Parsing PDF document...").start();
    try {
      if (!existsSync(file)) {
        spinner.fail(`File not found: ${file}`);
        process.exit(1);
      }
      const extractor = new PdfExtractor();
      const style = await extractor.extract(file);
      if (options.name) style.name = options.name;
      spinner.text = "Generating CSS...";
      const outputPath = writeThemeFile(style, options.output || options.themesDir);
      spinner.succeed(chalk.green(`Theme "${style.name}" generated: ${outputPath}`));
      printSummary(style);
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("extract")
  .description("Auto-detect source type and extract theme")
  .argument("<source>", "URL, .docx file, or .pdf file")
  .option("-n, --name <name>", "Theme name")
  .option("-o, --output <path>", "Output CSS file path")
  .option("-d, --themes-dir <dir>", "Themes directory", "themes")
  .action(async (source: string, options: Record<string, string>) => {
    const spinner = ora("Detecting source type...").start();
    try {
      const extractors: Extractor[] = [
        new UrlExtractor(),
        new DocxExtractor(),
        new PdfExtractor(),
      ];

      let extractor: Extractor | undefined;
      for (const e of extractors) {
        if (e.canHandle(source)) {
          extractor = e;
          break;
        }
      }

      if (!extractor) {
        spinner.fail(
          `Cannot detect source type for: ${source}. Use from-url, from-docx, or from-pdf directly.`
        );
        process.exit(1);
      }

      if (!extractor.canHandle(source)) {
        spinner.fail("Unsupported source type.");
        process.exit(1);
      }

      spinner.text = "Extracting styles...";
      const style = await extractor.extract(source);
      if (options.name) style.name = options.name;
      spinner.text = "Generating CSS...";
      const outputPath = writeThemeFile(style, options.output || options.themesDir);
      spinner.succeed(chalk.green(`Theme "${style.name}" generated: ${outputPath}`));
      printSummary(style);
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all generated themes")
  .option("-d, --themes-dir <dir>", "Themes directory", "themes")
  .action((options: Record<string, string>) => {
    const dirPath = join(process.cwd(), options.themesDir);
    if (!existsSync(dirPath)) {
      console.log(chalk.yellow(`No themes directory found at: ${dirPath}`));
      return;
    }

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".css"));
    if (files.length === 0) {
      console.log(chalk.yellow("No themes found."));
      return;
    }

    console.log(chalk.bold(`\nThemes in ${dirPath}/:`));
    for (const file of files) {
      console.log(`  ${chalk.cyan("●")} ${chalk.white(file.replace(".css", ""))}  ${chalk.dim(`(${file})`)}`);
    }
    console.log(`\n${files.length} theme(s) total.\n`);
  });

function printSummary(style: import("./models.js").ThemeStyle): void {
  const p = style.palette;
  console.log(chalk.dim("\n  Palette summary:"));
  console.log(
    `  ${chalk.white("bg:")} ${p.bgColor}  ${chalk.white("text:")} ${p.textColor}  ${chalk.white("accent:")} ${p.accentColor}  ${chalk.white("heading:")} ${p.headingColor}`
  );
  console.log(
    `  ${chalk.white("code-bg:")} ${p.codeBlockBg}  ${chalk.white("code-text:")} ${p.codeBlockText}  ${chalk.white("blockquote:")} ${p.blockquoteBorder}`
  );
}

export function main(): void {
  program.parse();
}

main();
