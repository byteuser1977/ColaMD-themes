/**
 * Platform compatibility layer — decouples this package from the exact
 * @bytechain.cn/colamd (ColaMD-extend) version installed at runtime.
 *
 * The theme pipeline targets the 2.7.12 contract, but the platform keeps
 * moving (2.7.x stable lines auto-upgrade through the caret range; future
 * minor/prerelease lines may rename APIs or evolve the CSS contract). This
 * module answers two questions at runtime instead of failing cryptically:
 *
 *   1. Which platform build is installed, and does its machine-readable
 *      `themes/contract.json` still match the contract our themes are
 *      written against? (contract drift detection)
 *   2. Is the renderer entry's API surface the one we call? (capability
 *      probe, consumed by renderer.ts)
 *
 * Everything is null-safe: a missing contract file or an unknown layout
 * degrades to a non-fatal status rather than throwing, so diagnostics never
 * become a new failure mode.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Contract version this package's themes and validators are written against. */
export const SUPPORTED_CONTRACT = "2.7.12";

/** Minimum renderer entry (dist/lib/colamd-renderer.js) with the 2.x API. */
export const MIN_RENDERER_VERSION = "2.7.8-rc.2";

/** Status of the installed platform relative to what we support. */
export type CompatStatus =
  | "exact"        // contractVersion === SUPPORTED_CONTRACT
  | "drift"        // contract file present, version differs (older or newer)
  | "no-contract"  // package installed but no usable themes/contract.json (pre-2.7.8 or desktop-only build)
  | "not-installed";

export interface ColamdContract {
  contractVersion: string;
  liveVariables: string[];
  deadVariables: string[];
}

export interface ColamdCompat {
  /** Installed package version, or null when not found. */
  version: string | null;
  /** Root of the installed package, or null when not found. */
  packageRoot: string | null;
  /** Parsed themes/contract.json, or null when absent/unparseable. */
  contract: ColamdContract | null;
  status: CompatStatus;
  /** Live variables our themes need that the installed contract lacks. */
  missingLiveVariables: string[];
}

/** Live variables our themes must be able to set (frozen 2.7.12 anchor). */
const SUPPORTED_LIVE_VARIABLES: readonly string[] = Object.freeze([
  "--bg-color", "--text-color", "--text-secondary", "--text-muted",
  "--border-color", "--link-color", "--code-bg", "--code-block-bg",
  "--code-block-text", "--blockquote-border", "--blockquote-bg",
  "--table-header-bg", "--selection-bg", "--highlight-bg",
  "--font-body", "--font-mono", "--editor-font-size", "--editor-column-width",
  "--pele-bg", "--pele-surface", "--pele-surface-alt", "--pele-border",
  "--pele-line", "--pele-fg", "--pele-muted", "--pele-accent", "--pele-radius",
]);

/**
 * Locate the installed @bytechain.cn/colamd package root.
 * Checks relative to this module first, then the process cwd (covers the
 * dist/ layout and tsx dev runs alike).
 */
function findColamdRoot(): string | null {
  const candidates = [
    resolve(fileURLToPath(new URL("../node_modules/@bytechain.cn/colamd", import.meta.url))),
    resolve(process.cwd(), "node_modules/@bytechain.cn/colamd"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "package.json"))) return dir;
  }
  return null;
}

/** Read themes/contract.json from an arbitrary colamd package root. */
function readContractFrom(root: string): ColamdContract | null {
  const contractPath = join(root, "themes", "contract.json");
  if (!existsSync(contractPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(contractPath, "utf-8")) as Partial<ColamdContract>;
    if (typeof parsed.contractVersion !== "string" || !Array.isArray(parsed.liveVariables)) return null;
    return {
      contractVersion: parsed.contractVersion,
      liveVariables: parsed.liveVariables,
      deadVariables: Array.isArray(parsed.deadVariables) ? parsed.deadVariables : [],
    };
  } catch {
    return null;
  }
}

/**
 * Probe the installed platform. Never throws — every failure degrades to a
 * status that callers can report or ignore.
 */
export function getColamdCompat(): ColamdCompat {
  const root = findColamdRoot();
  if (!root) {
    return { version: null, packageRoot: null, contract: null, status: "not-installed", missingLiveVariables: [] };
  }
  let version: string | null = null;
  try {
    version = (JSON.parse(readFileSync(join(root, "package.json"), "utf-8")) as { version?: string }).version ?? null;
  } catch {
    /* keep null */
  }
  const contract = readContractFrom(root);
  if (!contract) {
    return { version, packageRoot: root, contract: null, status: "no-contract", missingLiveVariables: [] };
  }
  const status: CompatStatus = contract.contractVersion === SUPPORTED_CONTRACT ? "exact" : "drift";
  const installed = new Set(contract.liveVariables);
  const missingLiveVariables = SUPPORTED_LIVE_VARIABLES.filter((v) => !installed.has(v));
  return { version, packageRoot: root, contract, status, missingLiveVariables };
}

/**
 * One-line human-readable compatibility summary for CLI output.
 * Always returns a message (including "not installed"), so callers can print
 * it unconditionally.
 */
export function formatColamdCompat(compat: ColamdCompat = getColamdCompat()): string {
  if (compat.status === "not-installed") {
    return "@bytechain.cn/colamd 未安装";
  }
  const ver = compat.version ?? "(版本未知)";
  if (compat.status === "no-contract") {
    return `@bytechain.cn/colamd ${ver}（themes/contract.json 缺失或格式不符，无法核对契约）`;
  }
  const contract = compat.contract!;
  if (compat.status === "exact") {
    return `@bytechain.cn/colamd ${ver}（契约 ${contract.contractVersion}，与主题契约一致）`;
  }
  const drift = compat.missingLiveVariables.length > 0
    ? `，缺失活变量: ${compat.missingLiveVariables.join(", ")}`
    : "，活变量无缺失";
  return `@bytechain.cn/colamd ${ver}（契约 ${contract.contractVersion} ≠ 主题契约 ${SUPPORTED_CONTRACT}${drift}）`;
}

/** Renderer API surface the export pipeline depends on. */
export const REQUIRED_RENDERER_API = [
  "applyTheme",
  "setMarkdown",
  "ensureAllPluginsRendered",
  "buildExportHTML",
] as const;
