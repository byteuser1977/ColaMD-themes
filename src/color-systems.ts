/**
 * Local color system library — predefined seed palettes for popular color schemes.
 * Each scheme provides a complete SeedPalette (5 seed colors + variants).
 */

import type { SeedPalette } from "./validators.js";
import { hslHue, hslSaturation, hslLightness } from "./contrast.js";

export interface ColorSystem {
  id: string;
  name: string;
  nameCN: string;
  description: string;
  mode: "light" | "dark";
  palette: SeedPalette;
}

// ═══════════════════════════════════════════════════════════
// 莫兰迪 (Morandi) — 低饱和度灰调
// ═══════════════════════════════════════════════════════════

const morandiPink: ColorSystem = {
  id: "morandi-pink",
  name: "Morandi Pink",
  nameCN: "莫兰迪 灰粉",
  description: "低饱和度灰粉基调，柔和慵懒",
  mode: "light",
  palette: {
    accent: "#b08a82", accentLight: "#e8ddd8", accentDark: "#8b6b63",
    surface: "#f5f2f0", panel: "#ece6e2", panelAlt: "#e2dad5",
    ink: "#3a3533", inkMuted: "#8a807c", inkDim: "#b0a8a4",
    border: "#d8d2ce", borderStrong: "#c0b8b4",
  },
};

const morandiGreen: ColorSystem = {
  id: "morandi-green",
  name: "Morandi Green",
  nameCN: "莫兰迪 灰绿",
  description: "低饱和度灰绿调，沉静淡雅",
  mode: "light",
  palette: {
    accent: "#8a9b7a", accentLight: "#e2e8dc", accentDark: "#6b7a5e",
    surface: "#f4f5f2", panel: "#e8ebe4", panelAlt: "#dce0d5",
    ink: "#3a3d35", inkMuted: "#8a8d82", inkDim: "#b0b4a8",
    border: "#d4d8ce", borderStrong: "#bcc0b4",
  },
};

const morandiBlue: ColorSystem = {
  id: "morandi-blue",
  name: "Morandi Blue",
  nameCN: "莫兰迪 灰蓝",
  description: "低饱和度灰蓝调，冷静克制",
  mode: "light",
  palette: {
    accent: "#7a8fa0", accentLight: "#dce4e8", accentDark: "#5e7080",
    surface: "#f2f4f6", panel: "#e6eaee", panelAlt: "#dae0e6",
    ink: "#353a3f", inkMuted: "#828a92", inkDim: "#a8b0b8",
    border: "#ced4dc", borderStrong: "#b4bcc4",
  },
};

// ═══════════════════════════════════════════════════════════
// 马卡龙 (Macaron) — 粉彩糖果色
// ═══════════════════════════════════════════════════════════

const macaronStrawberry: ColorSystem = {
  id: "macaron-strawberry",
  name: "Macaron Strawberry",
  nameCN: "马卡龙 草莓",
  description: "柔粉奶油色，甜美活泼",
  mode: "light",
  palette: {
    accent: "#e893a6", accentLight: "#fde8ec", accentDark: "#c47082",
    surface: "#fefafb", panel: "#faf0f2", panelAlt: "#f4e4e8",
    ink: "#4a3035", inkMuted: "#9a8086", inkDim: "#c0a8ae",
    border: "#eed4d8", borderStrong: "#dab8be",
  },
};

const macaronMint: ColorSystem = {
  id: "macaron-mint",
  name: "Macaron Mint",
  nameCN: "马卡龙 薄荷",
  description: "清新薄荷绿，轻盈爽朗",
  mode: "light",
  palette: {
    accent: "#8cc9a8", accentLight: "#e6f6ee", accentDark: "#6aaa88",
    surface: "#f8fcfa", panel: "#eef6f2", panelAlt: "#e2f0e8",
    ink: "#304538", inkMuted: "#809588", inkDim: "#a8c0b0",
    border: "#cce8d6", borderStrong: "#b0d4bc",
  },
};

const macaronBlueberry: ColorSystem = {
  id: "macaron-blueberry",
  name: "Macaron Blueberry",
  nameCN: "马卡龙 蓝莓",
  description: "淡紫蓝调，温柔梦幻",
  mode: "light",
  palette: {
    accent: "#9aa8e0", accentLight: "#eaecf8", accentDark: "#7888c0",
    surface: "#f8f8fc", panel: "#f0f2f8", panelAlt: "#e6e8f4",
    ink: "#303548", inkMuted: "#808898", inkDim: "#a8b0c0",
    border: "#d0d4e8", borderStrong: "#b8bcd4",
  },
};

// ═══════════════════════════════════════════════════════════
// 北欧 (Nordic) — 极简自然色
// ═══════════════════════════════════════════════════════════

const nordicWood: ColorSystem = {
  id: "nordic-wood",
  name: "Nordic Wood",
  nameCN: "北欧 原木",
  description: "浅木色与暖白搭配，自然温馨",
  mode: "light",
  palette: {
    accent: "#8b7355", accentLight: "#e8e0d4", accentDark: "#6b5a40",
    surface: "#faf8f4", panel: "#f2eeea", panelAlt: "#e8e2dc",
    ink: "#3a3530", inkMuted: "#8a8078", inkDim: "#b0a89e",
    border: "#d8d0c4", borderStrong: "#c0b8aa",
  },
};

const nordicMinimal: ColorSystem = {
  id: "nordic-minimal",
  name: "Nordic Minimal",
  nameCN: "北欧 极简白",
  description: "纯白基调，冷蓝点缀，极致简洁",
  mode: "light",
  palette: {
    accent: "#4a7c96", accentLight: "#dce6ec", accentDark: "#3a6078",
    surface: "#fefefe", panel: "#f6f8fa", panelAlt: "#eef2f6",
    ink: "#2a2a2a", inkMuted: "#7a7a7a", inkDim: "#aaaaaa",
    border: "#e0e0e0", borderStrong: "#c8c8c8",
  },
};

const nordicGray: ColorSystem = {
  id: "nordic-gray",
  name: "Nordic Gray",
  nameCN: "北欧 灰调",
  description: "中灰基调，森林绿点缀，沉稳自然",
  mode: "light",
  palette: {
    accent: "#6b8a7a", accentLight: "#dce6e0", accentDark: "#4e6b5c",
    surface: "#f6f5f4", panel: "#edebe8", panelAlt: "#e2e0dc",
    ink: "#3a3a3a", inkMuted: "#8a8a8a", inkDim: "#b0b0b0",
    border: "#d8d6d2", borderStrong: "#c0beb8",
  },
};

// ═══════════════════════════════════════════════════════════
// 复古 (Vintage) — 暖棕岁月感
// ═══════════════════════════════════════════════════════════

const vintageWarmBrown: ColorSystem = {
  id: "vintage-brown",
  name: "Vintage Warm Brown",
  nameCN: "复古 暖棕",
  description: "暖棕纸色，旧时光氛围",
  mode: "light",
  palette: {
    accent: "#8b5e3c", accentLight: "#e8dcd0", accentDark: "#6b4428",
    surface: "#f8f2ea", panel: "#f0e8dc", panelAlt: "#e6dcc8",
    ink: "#3a3028", inkMuted: "#8a7a6a", inkDim: "#b0a090",
    border: "#d4c8b8", borderStrong: "#bca898",
  },
};

const vintageNewspaper: ColorSystem = {
  id: "vintage-newspaper",
  name: "Vintage Newspaper",
  nameCN: "复古 旧报纸",
  description: "泛黄纸色，怀旧阅读感",
  mode: "light",
  palette: {
    accent: "#7a5a3a", accentLight: "#e8dcc8", accentDark: "#5a4028",
    surface: "#f4f0e0", panel: "#ece4d0", panelAlt: "#e2d8c0",
    ink: "#3a3528", inkMuted: "#8a8070", inkDim: "#b0a898",
    border: "#c8c0a8", borderStrong: "#b0a890",
  },
};

const vintageWine: ColorSystem = {
  id: "vintage-wine",
  name: "Vintage Wine",
  nameCN: "复古 酒红",
  description: "暗酒红点缀，浓郁优雅",
  mode: "light",
  palette: {
    accent: "#8b3a3a", accentLight: "#e8d4d4", accentDark: "#6b2828",
    surface: "#f8f2f2", panel: "#f0e8e8", panelAlt: "#e6dcdc",
    ink: "#3a2a2a", inkMuted: "#8a7070", inkDim: "#b09898",
    border: "#d4c0c0", borderStrong: "#bca8a8",
  },
};

// ═══════════════════════════════════════════════════════════
// 薄荷绿 (Mint) — 清新自然
// ═══════════════════════════════════════════════════════════

const mintFresh: ColorSystem = {
  id: "mint-fresh",
  name: "Mint Fresh",
  nameCN: "薄荷绿 清新",
  description: "鲜嫩薄荷叶色，清爽宜人",
  mode: "light",
  palette: {
    accent: "#5aaa80", accentLight: "#dceee4", accentDark: "#408860",
    surface: "#f8fcfa", panel: "#eef6f2", panelAlt: "#e2f0e8",
    ink: "#2a3a30", inkMuted: "#708a78", inkDim: "#98b0a0",
    border: "#c8e4d4", borderStrong: "#a8ccb8",
  },
};

const mintDeep: ColorSystem = {
  id: "mint-deep",
  name: "Mint Deep",
  nameCN: "薄荷绿 深薄荷",
  description: "深邃薄荷绿，沉稳清新",
  mode: "light",
  palette: {
    accent: "#3a8a60", accentLight: "#d4e8dc", accentDark: "#286a48",
    surface: "#f4f8f6", panel: "#e8f0ec", panelAlt: "#dce8e2",
    ink: "#283830", inkMuted: "#708878", inkDim: "#98b0a0",
    border: "#b8dcc8", borderStrong: "#98c4ac",
  },
};

const mintDew: ColorSystem = {
  id: "mint-dew",
  name: "Mint Dew",
  nameCN: "薄荷绿 晨露",
  description: "晨露般清透浅绿，轻柔温和",
  mode: "light",
  palette: {
    accent: "#7ab898", accentLight: "#e0f0e8", accentDark: "#5a9878",
    surface: "#fafdfc", panel: "#f2f8f4", panelAlt: "#e8f2ec",
    ink: "#2c3832", inkMuted: "#788880", inkDim: "#a0b0a8",
    border: "#d0e8dc", borderStrong: "#b8d4c4",
  },
};

// ── Registry ──

export const COLOR_SYSTEMS: ColorSystem[] = [
  morandiPink, morandiGreen, morandiBlue,
  macaronStrawberry, macaronMint, macaronBlueberry,
  nordicWood, nordicMinimal, nordicGray,
  vintageWarmBrown, vintageNewspaper, vintageWine,
  mintFresh, mintDeep, mintDew,
];

export function getColorSystem(id: string): ColorSystem | undefined {
  return COLOR_SYSTEMS.find((cs) => cs.id === id);
}

/** Match extracted accent/surface to the nearest color system by hue + saturation distance. */
export function matchColorSystem(accent: string, surface: string): ColorSystem {
  const hAccent = hslHue(accent);
  const sAccent = hslSaturation(accent);
  const lSurface = hslLightness(surface);

  let best = COLOR_SYSTEMS[0];
  let bestDist = Infinity;

  for (const cs of COLOR_SYSTEMS) {
    const hCs = hslHue(cs.palette.accent);
    const sCs = hslSaturation(cs.palette.accent);
    const lCs = hslLightness(cs.palette.surface);

    // Weighted distance: hue 40%, saturation 30%, lightness 30%
    const dH = Math.abs(hAccent - hCs);
    const hueDist = Math.min(dH, 360 - dH) / 360; // wrap around
    const satDist = Math.abs(sAccent - sCs);
    const lumDist = Math.abs(lSurface - lCs);
    const dist = hueDist * 0.4 + satDist * 0.3 + lumDist * 0.3;

    if (dist < bestDist) {
      bestDist = dist;
      best = cs;
    }
  }
  return best;
}
