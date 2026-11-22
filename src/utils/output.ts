/**
 * Uniform CLI output — one line by default.
 *
 * The CLI is consumed by humans on a terminal AND by AI agents / MCP clients
 * that pay for every token. So the default contract is:
 *
 *   - success → a single summary line (no spinner residue, no tables)
 *   - `--json` → exactly one line of JSON on stdout (machine readable)
 *   - `--verbose` → the summary plus detail lines
 *   - failures → only the failing items, never the passing ones
 *
 * Spinners animate only on an interactive stderr; in pipes, CI and JSON mode
 * they degrade to silent no-ops so logs stay clean.
 */

import chalk from "chalk";
import ora, { type Ora } from "ora";
import type { ValidationIssue } from "../validators.js";

export interface OutputOptions {
  json?: boolean;
  verbose?: boolean;
}

export function wantsJson(options: OutputOptions): boolean {
  return Boolean(options.json);
}

export function wantsVerbose(options: OutputOptions): boolean {
  return Boolean(options.verbose);
}

/** Interactive terminal only: pipes, CI and --json never animate. */
export function canSpin(options: OutputOptions): boolean {
  if (options.json) return false;
  if (process.env.TERM === "dumb") return false;
  return Boolean(process.stderr.isTTY);
}

export interface Task {
  succeed(text?: string): void;
  fail(text?: string): void;
  stop(): void;
  setText(text: string): void;
}

const SILENT_TASK: Task = {
  succeed() {},
  fail() {},
  stop() {},
  setText() {},
};

/** Start a progress spinner, or a silent no-op when output is not a TTY. */
export function startTask(text: string, options: OutputOptions): Task {
  if (!canSpin(options)) return SILENT_TASK;
  let spinner: Ora;
  try {
    spinner = ora(text).start();
  } catch {
    return SILENT_TASK;
  }
  return {
    succeed: (t) => spinner.succeed(t),
    fail: (t) => spinner.fail(t),
    stop: () => spinner.stop(),
    setText: (t) => { spinner.text = t; },
  };
}

/** Result of a CLI command, rendered by `emit()`. */
export interface CommandResult<T> {
  ok: boolean;
  /** Human-facing one-liner (green when ok, red otherwise). */
  summary: string;
  /** Machine payload printed verbatim in --json mode. */
  data?: T;
  /** Extra lines printed in --verbose mode (or on failure). */
  details?: string[];
  /** Override the process exit code (defaults to 0 on ok, 1 on failure). */
  exitCode?: number;
}

/** Print a command result according to the output contract. */
export function emit<T>(options: OutputOptions, result: CommandResult<T>): void {
  if (options.json) {
    const payload = result.data ?? { ok: result.ok, summary: result.summary };
    console.log(JSON.stringify(payload));
  } else {
    console.log(result.ok ? chalk.green(result.summary) : chalk.red(result.summary));
    if (result.details && result.details.length > 0 && (result.ok ? options.verbose : true)) {
      for (const line of result.details) console.log(line);
    }
  }
  if (result.exitCode !== undefined) process.exitCode = result.exitCode;
  else if (!result.ok && !process.exitCode) process.exitCode = 1;
}

/** The failing findings only — passing rules are never printed. */
export function formatFailures(issues: ValidationIssue[]): string[] {
  return issues
    .filter((i) => i.level === "MUST" || i.level === "MUST_NOT")
    .map((i) => `  [${i.ruleId}] ${i.message}`);
}

/** Warnings (SHOULD / SHOULD_NOT), one line each. */
export function formatWarnings(issues: ValidationIssue[]): string[] {
  return issues
    .filter((i) => i.level === "SHOULD" || i.level === "SHOULD_NOT")
    .map((i) => `  [${i.ruleId}] ${i.message}`);
}

/** True when an issue list contains a contract violation. */
export function hasFailures(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.level === "MUST" || i.level === "MUST_NOT");
}
