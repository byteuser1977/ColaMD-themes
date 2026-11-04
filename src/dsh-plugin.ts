/**
 * DSH (DeepSeek Harness) host entry — declares this package as a dsh-market
 * plugin bundle (cordis.patch.yml → dsh.bundle.patch).
 *
 * The entry registers the bundled agent skill (`skills/colamd-themes/SKILL.md`)
 * with the Harness `skills` service, following the same provider protocol as
 * the bundled dsh-ppt plugin. The Harness runtime imports the package root and
 * consumes the `name / inject / apply` exports; the CLI never touches this
 * module, and the skill service import happens only inside `apply()`, so
 * standalone library consumers are unaffected.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

// Ambient shape of the host-provided skill service lives in
// src/types/dsh-skill.d.ts — the package is never installed at build time.

/** Cordis plugin identity. */
const name = "colamd-themes";

/** Required host services. */
const inject = ["skills"];

const PROVIDER = "colamd-themes-bundled";
const SKILL_NAME = "colamd-themes";
const DESCRIPTION =
  "Generate, validate, export, and manage ColaMD 2.7.8-rc.2 contract CSS themes. " +
  "Extract themes from URLs/DOCX/PDF; export Markdown to standalone HTML/PDF.";

interface SkillCandidate {
  name: string;
  description: string;
  invocation: { modelInvocable: boolean; userInvocable: boolean };
  provider: string;
  source: string;
  rank: number;
  locator: string;
}

interface SkillProvider {
  name: string;
  list(): Promise<SkillCandidate[]>;
  get(selected: { name: string }): Promise<(SkillCandidate & { content: string }) | undefined>;
}

interface DshPluginContext {
  skills: {
    registerProvider(factory: () => SkillProvider): void;
  };
}

/** Resolve the bundled skill rank; fall back when the host module differs. */
async function bundledSkillRank(): Promise<number> {
  try {
    const mod = (await import("@deepseek-ai/dsh-skill")) as { BUNDLED_SKILL_RANK?: number };
    return mod.BUNDLED_SKILL_RANK ?? 100;
  } catch {
    return 100;
  }
}

/** Register the bundled ColaMD Themes skill with the Harness skill service. */
function registerSkill(ctx: DshPluginContext, skillRoot: string, rank: number): void {
  const skillPath = path.join(path.resolve(skillRoot), "SKILL.md");
  const content = async () => (await readFile(skillPath, "utf8")).trimEnd();
  const candidate: SkillCandidate = {
    name: SKILL_NAME,
    description: DESCRIPTION,
    invocation: { modelInvocable: true, userInvocable: true },
    provider: PROVIDER,
    source: "bundled",
    rank,
    locator: skillPath,
  };
  const provider: SkillProvider = {
    name: PROVIDER,
    async list() {
      return content().then(() => [candidate]).catch(() => []);
    },
    async get(selected) {
      if (selected.name !== SKILL_NAME) return undefined;
      try {
        return { ...candidate, content: await content() };
      } catch {
        return undefined;
      }
    },
  };
  ctx.skills.registerProvider(() => provider);
}

/** Compose the plugin: register the bundled skill provider. */
async function apply(ctx: DshPluginContext): Promise<void> {
  // Fault tolerance across DSH runtime upgrades: if the host's skills service
  // shape ever drifts (renamed registerProvider, changed inject contract),
  // degrade to a warning instead of crashing profile composition — the CLI
  // bins keep working regardless, and a later runtime can re-register.
  try {
    const skillRoot = fileURLToPath(new URL("../skills/colamd-themes", import.meta.url));
    registerSkill(ctx, skillRoot, await bundledSkillRank());
  } catch (e) {
    console.warn(
      `[colamd-themes] bundled skill registration failed (runtime may have changed its skills service): ` +
      `${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export { apply, inject, name };
