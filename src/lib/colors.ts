// 顏色系統：預設色票 + 對比色計算。
// 不額外存「文字顏色」欄位——改色時容易忘記一起改，一律即時算。

// Material Design 標準色盤，每個色相給深（700）／中（500）／淺（300）三階。
export const PRESET_COLORS = [
  "#D32F2F", "#F44336", "#E57373", // Red
  "#C2185B", "#E91E63", "#F06292", // Pink
  "#7B1FA2", "#9C27B0", "#BA68C8", // Purple
  "#512DA8", "#673AB7", "#9575CD", // Deep Purple
  "#303F9F", "#3F51B5", "#7986CB", // Indigo
  "#1976D2", "#2196F3", "#64B5F6", // Blue
  "#0288D1", "#03A9F4", "#4FC3F7", // Light Blue
  "#0097A7", "#00BCD4", "#4DD0E1", // Cyan
  "#00796B", "#009688", "#4DB6AC", // Teal
  "#388E3C", "#4CAF50", "#81C784", // Green
  "#689F38", "#8BC34A", "#AED581", // Light Green
  "#AFB42B", "#CDDC39", "#DCE775", // Lime
  "#FBC02D", "#FFEB3B", "#FFF176", // Yellow
  "#FFA000", "#FFC107", "#FFD54F", // Amber
  "#F57C00", "#FF9800", "#FFB74D", // Orange
  "#E64A19", "#FF5722", "#FF8A65", // Deep Orange
  "#5D4037", "#795548", "#A1887F", // Brown
  "#616161", "#9E9E9E", "#E0E0E0", // Grey
  "#455A64", "#607D8B", "#90A4AE", // Blue Grey
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
