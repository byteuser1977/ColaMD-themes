#!/usr/bin/env node

import { Command } from "commander";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
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

const program = new Command();

program
  .name("colamd-themes")
  .description("ColaMD Theme Development Tool — extract formatting and generate v3.0 paradigm CSS themes")
  .version("0.2.0");

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
