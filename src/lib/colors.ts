// 顏色系統：預設色票 + 對比色計算。
// 不額外存「文字顏色」欄位——改色時容易忘記一起改，一律即時算。

// 19 個色相（跟 Material 色盤同一組命名順序），但用鮮豔色當「中」，
// 深／淺兩階由這裡直接用 HSL 亮度位移算出來，不是 Material 官方的 300/700。
const VIVID_HUE_MEDIUMS = [
  "#e03131", // Red
  "#e64980", // Pink
  "#ae3ec9", // Purple
  "#7048e8", // Deep Purple
  "#4263eb", // Indigo
  "#1c7ed6", // Blue
  "#339af0", // Light Blue
  "#15aabf", // Cyan
  "#0ca678", // Teal
  "#2f9e44", // Green
  "#74b816", // Light Green
  "#a9c936", // Lime
  "#f4c20d", // Yellow
  "#e8a30c", // Amber
  "#e8590c", // Orange
  "#d9480f", // Deep Orange
  "#8a5a3d", // Brown
  "#6b7280", // Grey
  "#4b6578", // Blue Grey
];

const DARK_DELTA = -16;
const LIGHT_DELTA = 16;

export const PRESET_COLORS: string[] = VIVID_HUE_MEDIUMS.flatMap((hex) => [
  shadeHex(hex, DARK_DELTA), // 深
  hex, // 中
  shadeHex(hex, LIGHT_DELTA), // 淺
]);

// WCAG 相對亮度，決定色塊上文字用白或黑。
export function getContrastTextColor(hex: string): "#ffffff" | "#111111" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#111111" : "#ffffff";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

// 把某個色相的「中」位移出「深」／「淺」——只調整 HSL 的 L，H/S 不變，
// 保證同一色相的三階看起來是同一家族，而不是各自亂挑的顏色。
function shadeHex(hex: string, lightnessDeltaPct: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const nextL = Math.max(4, Math.min(96, l + lightnessDeltaPct));
  return hslToHex(h, s, nextL);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l: l * 100 };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / delta) % 6;
      break;
    case gn:
      h = (bn - rn) / delta + 2;
      break;
    default:
      h = (rn - gn) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Task 顯示顏色的繼承規則（見規劃書第五節）：
// Personal Task → Personal 預設色
// Work Task → Project Color；沒有 Project → Work fallback 色
export function resolveTaskColor(params: {
  areaType: "personal" | "work" | null | undefined;
  projectColor?: string | null;
  personalDefaultColor: string;
  workFallbackColor: string;
}): string {
  const { areaType, projectColor, personalDefaultColor, workFallbackColor } = params;
  if (areaType === "work") {
    return projectColor || workFallbackColor;
  }
  return personalDefaultColor;
}
