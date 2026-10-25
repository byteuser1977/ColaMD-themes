/**
 * Paradigm validation engine — checks SeedPalette against v4.0 design constraints
 * and scans generated CSS for the ColaMD 2.7.7 theme contract.
 * Based on theme-paradigm.md Section 2.
 */

import { parse, walk, generate } from "css-tree";
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

// ═══════════════════════════════════════════════════════════
// CSS contract validation (ColaMD 2.7.7)
// ═══════════════════════════════════════════════════════════

/** 2.7 编辑器不再消费的变量：留着只会让人照抄。 */
const DEAD_VARIABLES = new Set([
  "--surface-color", "--surface-alt", "--text-dim", "--heading-color",
  "--accent-color", "--accent-dark", "--accent-light", "--hr-color",
  "--code-color", "--code-block-color", "--table-border",
  "--content-width", "--font-size-root", "--font-heading", "--font-code",
  "--font-mermaid", "--font-size-mermaid",
]);

/** 前缀匹配的死变量族（Mermaid 20 变量、圆角、字阶、行高、滚动条）。 */
const DEAD_VARIABLE_PREFIXES = [
  "--mermaid-", "--radius-", "--font-scale-", "--line-height-", "--scrollbar-thumb",
];

/** 旧编辑器 DOM 的选择器：在 CodeMirror 6 里命中不到任何元素。 */
const DEAD_SELECTOR_PATTERNS: Array<{ re: RegExp; label: string; fix: string }> = [
  { re: /(^|[\s>+~,])#write(?![-\w])/, label: "#write", fix: "改用 #editor .cm-content" },
  { re: /\.ProseMirror\b/, label: ".ProseMirror", fix: "改用 #editor .cm-content .cm-md-*" },
  { re: /\.theme-custom\b/, label: "body.theme-custom", fix: "自定义主题变量写在 :root" },
  { re: /\.mermaid-(block|preview)\b/, label: ".mermaid-*", fix: "图表用 .cm-md-mermaid 与 --pele-*" },
];

/** 引用块/代码块在 CM6 里一行一个 div，纵向 padding 会按行累加。 */
function hasVerticalPadding(rule: { block: { children: { forEach: (cb: (node: any) => void) => void } } }): boolean {
  let found = false;
  rule.block.children.forEach((node: any) => {
    if (node.type !== "Declaration" || node.property.startsWith("--")) return;
    if (node.property === "padding") {
      const values = generate(node.value).trim().split(/\s+/);
      // 1~2 个值：第一个是纵向；3 个值：第二个；4 个值：第一个与第三个。
      const vertical = values.length === 1 ? values[0]
        : values.length === 2 ? values[0]
        : values.length === 3 ? values[1] : `${values[0]} ${values[2]}`;
      if (vertical.split(/\s+/).some((v) => !/^0(px|em|rem|%)?$/.test(v))) found = true;
    } else if (node.property === "padding-top" || node.property === "padding-bottom") {
      const value = generate(node.value).trim();
      if (!/^0(px|em|rem|%)?$/.test(value)) found = true;
    }
  });
  return found;
}

/** 校验生成的 CSS 是否符合 ColaMD 2.7.7 契约。 */
export function validateThemeCss(css: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ast = parse(css, { positions: false });
  let hasRootBlock = false;

  walk(ast, (node) => {
    if (node.type === "Declaration" && node.property.startsWith("--")) {
      const name = node.property;
      const dead = DEAD_VARIABLES.has(name)
        || DEAD_VARIABLE_PREFIXES.some((prefix) => name.startsWith(prefix));
      if (dead) {
        issues.push({
          ruleId: "CSS-01",
          level: "MUST_NOT",
          message: `变量 ${name} 在 ColaMD 2.7.7 已不再消费`,
          fix: "改用活变量清单（--bg-color / --text-secondary / --pele-* 等）",
        });
      }
    }

    if (node.type === "Rule" && node.prelude.type === "SelectorList") {
      const selector = generate(node.prelude);
      if (/(^|,)\s*:root\b/.test(selector)) hasRootBlock = true;

      for (const dead of DEAD_SELECTOR_PATTERNS) {
        if (dead.re.test(selector)) {
          issues.push({
            ruleId: "CSS-02",
            level: "MUST_NOT",
            message: `选择器 ${dead.label} 在 CodeMirror 6 中命中不到元素（${selector}）`,
            fix: dead.fix,
          });
        }
      }

      if (/\.cm-md-(blockquote|codeblock)\b/.test(selector) && hasVerticalPadding(node)) {
        issues.push({
          ruleId: "CSS-03",
          level: "MUST_NOT",
          message: `引用/代码块不能设置纵向 padding（每行一个 div，会按行累加）：${selector}`,
          fix: "只设 padding-left / padding-right",
        });
      }

      walk(node.block, (child) => {
        if (child.type === "Declaration" && child.value.type === "Value") {
          walk(child.value, (valueNode) => {
            if (valueNode.type === "Dimension" && valueNode.unit === "pt") {
              issues.push({
                ruleId: "CSS-04",
                level: "MUST_NOT",
                message: `使用了 pt 单位：${child.property}: ${generate(child.value)}`,
                fix: "统一换算为 px（1pt ≈ 1.333px）",
              });
            }
          });
        }
      });
    }
  });

  if (!hasRootBlock) {
    issues.push({
      ruleId: "CSS-05",
      level: "MUST",
      message: "缺少 :root 根块，主题变量无法被继承",
      fix: "把变量块写到 :root 上",
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
