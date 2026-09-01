// 顏色系統：預設色票 + 對比色計算。
// 不額外存「文字顏色」欄位——改色時容易忘記一起改，一律即時算。

export const PRESET_COLORS = [
  "#d64545", // 紅
  "#e8710a", // 橘
  "#e0a82e", // 黃／琥珀
  "#1e8e5a", // 綠
  "#12b886", // 薄荷
  "#00897b", // 青
  "#4f8fe0", // 天藍
  "#3d6bff", // 藍
  "#6741d9", // 靛
  "#8430ce", // 紫
  "#c2185b", // 桃紅
  "#d6336c", // 玫瑰紅
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
