/**
 * Platform compatibility layer — decouples this package from the exact
 * @bytechain.cn/colamd (ColaMD-extend) version installed at runtime.
 *
 * The theme pipeline targets the 2.7.13 contract, but the platform keeps
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
export const SUPPORTED_CONTRACT = "2.7.13";

/**
 * Contracts we accept as "exact" — 2.7.13 stable only. Its contract.json is
 * identical to the 2.7.12 anchor (no live/dead variable changes; the 2.7.13
 * line only adds the slide layout system), so themes carry over unchanged.
 */
export const SUPPORTED_CONTRACTS: readonly string[] = Object.freeze([
  "2.7.13",
]);

/** Minimum platform version with the slide layout system (2.7.13-rc.1+). */
export const SLIDES_MIN_VERSION = "2.7.13-rc.1";

/** Minimum renderer entry (dist/lib/colamd-renderer.js) with the 2.x API. */
export const MIN_RENDERER_VERSION = "2.7.13";

/**
 * Minimum platform version whose lib entry exposes the slides PDF export API
 * (`enterSlidesPrintLayout` / `exitSlidesPrintLayout`). 2.7.13-rc.1 already
 * ships the slide layout system, but its dist/lib bundle predates the export
 * API — so version alone is not enough and the bundle is probed directly.
 */
export const SLIDES_EXPORT_MIN_VERSION = "2.7.13";

/** Lib-entry methods required for 16:9 slide PDF export. */
export const REQUIRED_SLIDES_API = [
  "enterSlidesPrintLayout",
  "exitSlidesPrintLayout",
] as const;

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
  /**
   * Whether the installed platform ships the slide layout system
   * (slides.css + cm-md-page/slide editor hooks). Theme PPT sections are
   * inert without it — presentation styling only applies in-app.
   */
  slidesSupported: boolean;
  /**
   * Whether the lib entry exposes the slides PDF export API. This is what
   * `export-slides` / `ppt` need to produce a 16:9 deck PDF.
   */
  slidesExportSupported: boolean;
}

/** Live variables our themes must be able to set (frozen 2.7.13 anchor). */
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
 * Compare two 2.x versions, understanding the `-rc.N` suffix used by the
 * upstream release line (2.7.13-rc.1 < 2.7.13). Unparseable versions compare
 * as equal so callers degrade to non-fatal diagnostics instead of crashing.
 */
export function compareColamdVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/.exec(v.trim());
    return m
      ? { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), rc: m[4] ? Number(m[4]) : Infinity }
      : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return 0;
  for (const key of ["major", "minor", "patch"] as const) {
    if (pa[key] !== pb[key]) return pa[key] - pb[key];
  }
  return pa.rc - pb.rc;
}

/**
 * Detect the slide layout system (ColaMD 2.7.13-rc.1+). Primary signal is the
 * installed version; fallback greps colamd.css for rc.2-specific markers
 * (--slide-page-top-pad / .cm-md-slide-), so a locally linked build still
 * probes. Generic "--slide-" is deliberately avoided: 2.7.12 already ships a
 * legacy --slide-font-size from the plain slideshow.
 */
function detectSlidesSupport(root: string | null, version: string | null): boolean {
  if (version && compareColamdVersions(version, SLIDES_MIN_VERSION) >= 0) return true;
  if (!root) return false;
  const cssPath = join(root, "dist", "lib", "colamd.css");
  if (!existsSync(cssPath)) return false;
  try {
    const css = readFileSync(cssPath, "utf-8");
    return css.includes("--slide-page-top-pad") || css.includes(".cm-md-slide-");
  } catch {
    return false;
  }
}

/**
 * Probe the renderer bundle for the slides export API. A locally linked or
 * newly built 2.7.13 may have the methods without a matching package version,
 * so the bundle text is authoritative. Missing bundle → unsupported.
 */
function detectSlidesExportSupport(root: string | null): boolean {
  if (!root) return false;
  const bundlePath = join(root, "dist", "lib", "colamd-renderer.js");
  if (!existsSync(bundlePath)) return false;
  try {
    const bundle = readFileSync(bundlePath, "utf-8");
    return REQUIRED_SLIDES_API.every((name) => bundle.includes(name));
  } catch {
    return false;
  }
}

/**
 * Probe the installed platform. Never throws — every failure degrades to a
 * status that callers can report or ignore.
 */
export function getColamdCompat(): ColamdCompat {
  const root = findColamdRoot();
  if (!root) {
    return { version: null, packageRoot: null, contract: null, status: "not-installed", missingLiveVariables: [], slidesSupported: false, slidesExportSupported: false };
  }
  let version: string | null = null;
  try {
    version = (JSON.parse(readFileSync(join(root, "package.json"), "utf-8")) as { version?: string }).version ?? null;
  } catch {
    /* keep null */
  }
  const slidesSupported = detectSlidesSupport(root, version);
  const slidesExportSupported = detectSlidesExportSupport(root);
  const contract = readContractFrom(root);
  if (!contract) {
    return { version, packageRoot: root, contract: null, status: "no-contract", missingLiveVariables: [], slidesSupported, slidesExportSupported };
  }
  const status: CompatStatus = SUPPORTED_CONTRACTS.includes(contract.contractVersion) ? "exact" : "drift";
  const installed = new Set(contract.liveVariables);
  const missingLiveVariables = SUPPORTED_LIVE_VARIABLES.filter((v) => !installed.has(v));
  return { version, packageRoot: root, contract, status, missingLiveVariables, slidesSupported, slidesExportSupported };
}

/**
 * One-line human-readable compatibility summary for CLI output.
 * Always returns a message (including "not installed"), so callers can print
 * it unconditionally.
 */
export function formatColamdCompat(compat: ColamdCompat = getColamdCompat()): string {
  const slides = compat.slidesSupported
    ? "幻灯片版式: 支持"
    : "幻灯片版式: 不支持（放映样式需 ColaMD ≥ 2.7.13-rc.1，PPT 令牌将保持惰性）";
  const slidesExport = compat.slidesExportSupported
    ? "，PPT 导出: 支持"
    : `，PPT 导出: 不支持（需 ColaMD ≥ ${SLIDES_EXPORT_MIN_VERSION} 且 lib 暴露 ${REQUIRED_SLIDES_API.join("/")}）`;
  const slidesLine = slides + slidesExport;
  if (compat.status === "not-installed") {
    return `@bytechain.cn/colamd 未安装；${slidesLine}`;
  }
  const ver = compat.version ?? "(版本未知)";
  if (compat.status === "no-contract") {
    return `@bytechain.cn/colamd ${ver}（themes/contract.json 缺失或格式不符，无法核对契约）；${slidesLine}`;
  }
  const contract = compat.contract!;
  if (compat.status === "exact") {
    return `@bytechain.cn/colamd ${ver}（契约 ${contract.contractVersion}，与主题契约一致）；${slidesLine}`;
  }
  const drift = compat.missingLiveVariables.length > 0
    ? `，缺失活变量: ${compat.missingLiveVariables.join(", ")}`
    : "，活变量无缺失";
  return `@bytechain.cn/colamd ${ver}（契约 ${contract.contractVersion} ≠ 主题契约 ${SUPPORTED_CONTRACT}${drift}）；${slidesLine}`;
}

/** Renderer API surface the export pipeline depends on. */
export const REQUIRED_RENDERER_API = [
  "applyTheme",
  "setMarkdown",
  "ensureAllPluginsRendered",
  "buildExportHTML",
] as const;
