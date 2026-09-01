// 顏色系統：預設色票 + 對比色計算。
// 不額外存「文字顏色」欄位——改色時容易忘記一起改，一律即時算。

export const PRESET_COLORS = [
  "#c92a2a", // 深紅
  "#e03131", // 紅
  "#d9480f", // 焦橘
  "#e8590c", // 橘
  "#e8a30c", // 琥珀
  "#74b816", // 萊姆綠
  "#2f9e44", // 綠
  "#087f5b", // 深綠
  "#0ca678", // 薄荷
  "#099268", // 深薄荷
  "#15aabf", // 青
  "#1098ad", // 深青
  "#1c7ed6", // 藍
  "#364fc7", // 深藍
  "#4263eb", // 寶藍
  "#7048e8", // 靛
  "#9c36b5", // 紫
  "#862e9c", // 深紫
  "#ae3ec9", // 洋紅
  "#d6336c", // 玫瑰紅
  "#e64980", // 桃紅
  "#f06595", // 粉紅
  "#9a86ac", // 柔紫（Personal 預設）
  "#5b7f9a", // 霧藍（Work fallback 預設）
] as const;

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
