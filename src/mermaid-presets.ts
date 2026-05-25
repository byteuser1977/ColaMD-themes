/**
 * Mermaid 20-variable presets for light, dark, and elegant theme modes.
 * Based on ColaMD-extend reference themes (elegant.css, forest-ink.css, guizang.css).
 */

import { isLightMode, hslHue } from "./contrast.js";

export interface MermaidPreset {
  id: string;
  name: string;
  description: string;
  variables: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════
// Light Preset — warm paper tone (from elegant.css style)
// ═══════════════════════════════════════════════════════════

const lightPreset: MermaidPreset = {
  id: "light",
  name: "Light",
  description: "亮色主题 Mermaid 预设 — 暖色调，节点用浅色填充、accent 描边",
  variables: {
    "mermaid-background": "var(--seed-panel)",
    "mermaid-border-color": "var(--seed-border)",
    "mermaid-border-radius": "var(--radius-md)",
    "mermaid-padding": "20px",
    "mermaid-font-family": "var(--font-mermaid)",
    "mermaid-font-size": "var(--font-size-mermaid)",
    "mermaid-node-fill": "var(--seed-panel)",
    "mermaid-node-stroke": "var(--seed-accent)",
    "mermaid-node-stroke-width": "1.5px",
    "mermaid-node-text": "var(--seed-ink)",
    "mermaid-edge-stroke": "var(--seed-ink-muted)",
    "mermaid-edge-stroke-width": "1.5px",
    "mermaid-cluster-fill": "rgba accent 0.06",
    "mermaid-cluster-stroke": "var(--seed-accent)",
    "mermaid-label-text": "var(--seed-ink)",
    "mermaid-edge-label-text": "var(--seed-ink-muted)",
    "mermaid-edge-label-bg": "var(--seed-surface)",
    "mermaid-title-text": "var(--seed-ink)",
    "mermaid-axis-text": "var(--seed-ink-muted)",
    "mermaid-highlight": "var(--seed-accent)",
    "mermaid-person-stroke": "var(--seed-ink)",
    "mermaid-person-fill": "var(--seed-panel)",
    "mermaid-label-offset-y": "0px",
  },
};

// ═══════════════════════════════════════════════════════════
// Dark Preset — dark background (for dark themes)
// ═══════════════════════════════════════════════════════════

const darkPreset: MermaidPreset = {
  id: "dark",
  name: "Dark",
  description: "暗色主题 Mermaid 预设 — 深色背景，亮色节点",
  variables: {
    "mermaid-background": "var(--seed-panel-alt)",
    "mermaid-border-color": "var(--seed-border-strong)",
    "mermaid-border-radius": "var(--radius-md)",
    "mermaid-padding": "20px",
    "mermaid-font-family": "var(--font-mermaid)",
    "mermaid-font-size": "var(--font-size-mermaid)",
    "mermaid-node-fill": "var(--seed-panel)",
    "mermaid-node-stroke": "var(--seed-accent-light)",
    "mermaid-node-stroke-width": "1.5px",
    "mermaid-node-text": "var(--seed-ink)",
    "mermaid-edge-stroke": "var(--seed-ink-muted)",
    "mermaid-edge-stroke-width": "1.5px",
    "mermaid-cluster-fill": "rgba accent 0.08",
    "mermaid-cluster-stroke": "var(--seed-border-strong)",
    "mermaid-label-text": "var(--seed-ink)",
    "mermaid-edge-label-text": "var(--seed-ink-muted)",
    "mermaid-edge-label-bg": "var(--seed-surface)",
    "mermaid-title-text": "var(--seed-ink)",
    "mermaid-axis-text": "var(--seed-ink-muted)",
    "mermaid-highlight": "var(--seed-accent)",
    "mermaid-person-stroke": "var(--seed-ink)",
    "mermaid-person-fill": "var(--seed-panel)",
    "mermaid-label-offset-y": "0px",
  },
};

// ═══════════════════════════════════════════════════════════
// Elegant Preset — warm toned (for warm ink/paper themes)
// ═══════════════════════════════════════════════════════════

const elegantPreset: MermaidPreset = {
  id: "elegant",
  name: "Elegant",
  description: "典雅暖调 Mermaid 预设 — 米色底 + 暖棕点缀",
  variables: {
    "mermaid-background": "var(--seed-panel)",
    "mermaid-border-color": "var(--seed-border)",
    "mermaid-border-radius": "var(--radius-md)",
    "mermaid-padding": "20px",
    "mermaid-font-family": "var(--font-mermaid)",
    "mermaid-font-size": "var(--font-size-mermaid)",
    "mermaid-node-fill": "var(--seed-panel)",
    "mermaid-node-stroke": "var(--seed-accent)",
    "mermaid-node-stroke-width": "1.5px",
    "mermaid-node-text": "var(--seed-ink)",
    "mermaid-edge-stroke": "var(--seed-ink-muted)",
    "mermaid-edge-stroke-width": "1.5px",
    "mermaid-cluster-fill": "rgba accent 0.04",
    "mermaid-cluster-stroke": "var(--seed-accent)",
    "mermaid-label-text": "var(--seed-ink)",
    "mermaid-edge-label-text": "var(--seed-ink-muted)",
    "mermaid-edge-label-bg": "var(--seed-surface)",
    "mermaid-title-text": "var(--seed-ink)",
    "mermaid-axis-text": "var(--seed-ink-muted)",
    "mermaid-highlight": "var(--seed-accent)",
    "mermaid-person-stroke": "var(--seed-ink)",
    "mermaid-person-fill": "var(--seed-panel)",
    "mermaid-label-offset-y": "0px",
  },
};

// ── Registry ──

export const MERMAID_PRESETS: MermaidPreset[] = [lightPreset, darkPreset, elegantPreset];

export function getMermaidPreset(id: string): MermaidPreset | undefined {
  return MERMAID_PRESETS.find((p) => p.id === id);
}

/** Auto-select Mermaid preset based on background luminance. */
export function selectMermaidPreset(
  bgHex: string,
  accentHex: string
): MermaidPreset {
  const light = isLightMode(bgHex);
  if (!light) return darkPreset;

  // For light themes: check accent warmth — warm accent → elegant, cool → light
  const hue = hslHue(accentHex);
  // Warm hues: red (0-30), orange (30-50), brown is low sat orange
  if (hue >= 0 && hue <= 50) return elegantPreset;

  return lightPreset;
}
