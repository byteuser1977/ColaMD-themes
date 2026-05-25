/**
 * Paradigm validation engine — checks SeedPalette against v3.0 design constraints.
 * Based on theme-paradigm.md Section 2.
 */

import { contrastRatio, hslSaturation, hslLightness, hslHue, sameHueAxis, isLightMode } from "./contrast.js";

export interface ValidationIssue {
  ruleId: string;
  level: "MUST" | "MUST_NOT" | "SHOULD" | "SHOULD_NOT";
  message: string;
  fix?: string;
}

export interface SeedPalette {
  accent: string;
  accentLight: string;
  accentDark: string;
  surface: string;
  panel: string;
  panelAlt: string;
  ink: string;
  inkMuted: string;
  inkDim: string;
  border: string;
  borderStrong: string;
}

export function validateSeedPalette(palette: SeedPalette): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const light = isLightMode(palette.surface);

  // CR-01: ink vs surface ≥ 7:1
  const crInk = contrastRatio(palette.ink, palette.surface);
  if (crInk < 7.0) {
    issues.push({
      ruleId: "CR-01",
      level: "MUST",
      message: `正文-底色对比度 ${crInk.toFixed(1)}:1 < 7:1 (WCAG AAA)`,
      fix: `建议加深 ink 或调浅 surface`,
    });
  }

  // CR-02: inkMuted vs surface ≥ 4.5:1
  const crMuted = contrastRatio(palette.inkMuted, palette.surface);
  if (crMuted < 4.5) {
    issues.push({
      ruleId: "CR-02",
      level: "MUST",
      message: `次要文字-底色对比度 ${crMuted.toFixed(1)}:1 < 4.5:1 (WCAG AA)`,
    });
  }

  // CR-04: accent vs surface ≥ 4.5:1
  const crAccent = contrastRatio(palette.accent, palette.surface);
  if (crAccent < 4.5) {
    issues.push({
      ruleId: "CR-04",
      level: "MUST",
      message: `点缀色-底色对比度 ${crAccent.toFixed(1)}:1 < 4.5:1`,
    });
  }

  // SL-01: surface saturation ≤ 0.05
  const sSurface = hslSaturation(palette.surface);
  if (sSurface > 0.05) {
    issues.push({
      ruleId: "SL-01",
      level: "MUST",
      message: `底色饱和度 ${(sSurface * 100).toFixed(1)}% > 5%，页面会偏色`,
    });
  }

  // SL-02: panel/panelAlt saturation ≤ 0.10
  for (const [name, hex] of [["panel", palette.panel], ["panelAlt", palette.panelAlt]] as const) {
    const s = hslSaturation(hex);
    if (s > 0.10) {
      issues.push({
        ruleId: "SL-02",
        level: "MUST_NOT",
        message: `表面色 ${name} 饱和度 ${(s * 100).toFixed(1)}% > 10%`,
      });
    }
  }

  // SL-03: surface/panel/panelAlt same hue axis
  if (!sameHueAxis(palette.surface, palette.panel, 5) || !sameHueAxis(palette.surface, palette.panelAlt, 5)) {
    issues.push({
      ruleId: "SL-03",
      level: "SHOULD",
      message: "三层表面色应保持相同色相轴（H 偏差 ≤ 5°）",
    });
  }

  // SL-04: L(surface) > L(panel) > L(panelAlt) for light
  const lSurface = hslLightness(palette.surface);
  const lPanel = hslLightness(palette.panel);
  const lPanelAlt = hslLightness(palette.panelAlt);
  if (light) {
    if (!(lSurface > lPanel && lPanel > lPanelAlt)) {
      issues.push({
        ruleId: "SL-04",
        level: "MUST",
        message: `浅色主题要求 L(surface) > L(panel) > L(panelAlt)`,
      });
    }
  } else {
    if (!(lSurface < lPanel && lPanel < lPanelAlt)) {
      issues.push({
        ruleId: "SL-04",
        level: "MUST",
        message: `深色主题要求 L(surface) < L(panel) < L(panelAlt)`,
      });
    }
  }

  // NT-01: ink/inkMuted/inkDim same hue axis
  if (!sameHueAxis(palette.ink, palette.inkMuted, 3) || !sameHueAxis(palette.ink, palette.inkDim, 3)) {
    issues.push({
      ruleId: "NT-01",
      level: "MUST",
      message: "文字色必须位于同一色相轴（H 偏差 ≤ 3°）",
    });
  }

  // NT-02: border vs panel lightness diff ≥ 0.08
  const lBorder = hslLightness(palette.border);
  if (Math.abs(lBorder - lPanel) < 0.08) {
    issues.push({
      ruleId: "NT-02",
      level: "MUST",
      message: `边框色与 panel 明度差 ${Math.abs(lBorder - lPanel).toFixed(3)} < 0.08，边框不可见`,
    });
  }

  // NT-03: border should be neutral gray
  const sBorder = hslSaturation(palette.border);
  if (sBorder > 0.05) {
    issues.push({
      ruleId: "NT-03",
      level: "SHOULD",
      message: `边框色饱和度 ${(sBorder * 100).toFixed(1)}% > 5%，应使用中性灰`,
    });
  }

  // HR-01: accent saturation ≥ 0.30 for light themes
  const sAccent = hslSaturation(palette.accent);
  if (light && sAccent < 0.30) {
    issues.push({
      ruleId: "HR-01",
      level: "SHOULD",
      message: `点缀色饱和度 ${(sAccent * 100).toFixed(1)}% < 30%，建议选暖色或冷色`,
    });
  }

  return issues;
}

/** Summarize validation results. */
export function summarizeIssues(issues: ValidationIssue[]): string {
  const errors = issues.filter((i) => i.level === "MUST" || i.level === "MUST_NOT");
  const warnings = issues.filter((i) => i.level === "SHOULD" || i.level === "SHOULD_NOT");
  const lines: string[] = [];
  if (errors.length > 0) {
    lines.push(`ERRORS (${errors.length}):`);
    for (const e of errors) lines.push(`  [${e.ruleId}] ${e.message}`);
  }
  if (warnings.length > 0) {
    lines.push(`WARNINGS (${warnings.length}):`);
    for (const w of warnings) lines.push(`  [${w.ruleId}] ${w.message}`);
  }
  if (errors.length === 0 && warnings.length === 0) {
    lines.push("All validations passed.");
  }
  return lines.join("\n");
}
