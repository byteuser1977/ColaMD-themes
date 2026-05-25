/** WCAG 2.1 relative luminance and contrast ratio calculations. */

import { hexToRgb } from "./color-utils.js";

/** Linearize an sRGB channel value (0-255) → (0-1). */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance of a hex color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG 2.1 contrast ratio between two hex colors. Range: 1-21. */
export function contrastRatio(hex1: string, hex2: string): number {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Get HSL lightness (0-1) from a hex color. */
export function hslLightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return (max + min) / 2;
}

/** Get HSL saturation (0-1) from a hex color. */
export function hslSaturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/** Get HSL hue (0-360) from a hex color. */
export function hslHue(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(h * 60);
}

/** Check if two colors are on the same hue axis (within tolerance degrees). */
export function sameHueAxis(h1: string, h2: string, tolerance: number = 5): boolean {
  return Math.abs(hslHue(h1) - hslHue(h2)) <= tolerance;
}

/** Determine if a palette is light mode (bg luminance > 0.5). */
export function isLightMode(bgHex: string): boolean {
  return hslLightness(bgHex) > 0.5;
}
