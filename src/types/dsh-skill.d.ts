/**
 * Ambient declaration for the DSH host-provided skill service.
 *
 * `@deepseek-ai/dsh-skill` exists only inside a DSH runtime: the installer
 * deletes plugin-private copies and forces resolution to the host singleton,
 * so the package is never present at build time. Only the surface used by
 * src/dsh-plugin.ts is declared here.
 */
declare module "@deepseek-ai/dsh-skill" {
  /** Ordering rank assigned to skills bundled with dsh-market plugins. */
  export const BUNDLED_SKILL_RANK: number;
}
