/**
 * Shared utility functions for CLI commands.
 * Provides consistent file path resolution and error handling.
 */

import { existsSync } from "node:fs";
import { resolve, isAbsolute, basename } from "node:path";

/**
 * Resolve input file path with validation.
 * Converts relative paths to absolute and checks existence.
 *
 * @param input  File path provided by user
 * @returns Resolved absolute path
 * @throws Error if file does not exist
 */
export function resolveInputPath(input: string): string {
  const path = isAbsolute(input) ? input : resolve(process.cwd(), input);
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }
  return path;
}

/**
 * Resolve output file path with sensible defaults.
 * If output path is not specified, derives it from input path by replacing extension.
 *
 * @param inputPath  Resolved absolute input path
 * @param output  Optional explicit output path
 * @param ext  Target extension (default: ".html")
 * @returns Resolved absolute output path
 */
export function resolveOutputPath(inputPath: string, output?: string, ext = ".html"): string {
  if (output) {
    return isAbsolute(output) ? output : resolve(process.cwd(), output);
  }
  return inputPath.replace(/\.md$/i, ext);
}

/**
 * Get base filename without extension for use as document title.
 *
 * @param filePath  Absolute or relative file path
 * @returns Filename without extension
 */
export function getDocumentTitle(filePath: string): string {
  return basename(filePath, ".md");
}

/**
 * Standard error codes for CLI operations.
 * Enables consistent error handling across all commands.
 */
export enum ErrorCode {
  /** Input file not found */
  FILE_NOT_FOUND = 1,
  /** Theme resolution failed */
  THEME_ERROR = 2,
  /** Rendering/export failed */
  RENDER_ERROR = 3,
  /** Invalid arguments or configuration */
  INVALID_INPUT = 4,
  /** Unknown/unexpected error */
  UNKNOWN = 99,
}

/**
 * Custom error class for CLI operations with structured error codes.
 * Replaces direct process.exit() calls for better error propagation.
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = ErrorCode.UNKNOWN,
    public cause?: Error
  ) {
    super(message);
    this.name = "CLIError";
    if (cause) {
      this.stack = `${this.message}\nCaused by: ${cause.stack}`;
    }
  }
}
