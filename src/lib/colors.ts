// 顏色系統：預設色票 + 對比色計算。
// 不額外存「文字顏色」欄位——改色時容易忘記一起改，一律即時算。

// 每個色相給 700（深）／500（中）／200（淺）三階，數值照參考色盤圖直接抄，
// 200 保留一定飽和度（不是 50 那種快變白的粉彩），畫在色塊上還看得清楚。
export const PRESET_COLORS: string[] = [
  "#B71C1C", "#E03131", "#EF9A9A", // Red
  "#C2185B", "#E91E63", "#F48FB1", // Pink
  "#7B1FA2", "#9C27B0", "#CE93D8", // Purple
  "#512DA8", "#673AB7", "#B39DDB", // Deep Purple
  "#303F9F", "#3F51B5", "#9FA8DA", // Indigo
  "#1976D2", "#2196F3", "#90CAF9", // Blue
  "#0097A7", "#00BCD4", "#80DEEA", // Cyan
  "#00796B", "#009688", "#80CBC4", // Teal
  "#388E3C", "#4CAF50", "#A5D6A7", // Green
  "#FFA000", "#FFC107", "#FFE082", // Amber
  "#F57C00", "#FF9800", "#FFCC80", // Orange
  "#AFB42B", "#CDDC39", "#DCE775", // Lime
  "#FBC02D", "#FFEB3B", "#FFF59D", // Yellow
  "#DB4315", "#FF5722", "#FFAB91", // Deep Orange
  "#5D4037", "#795548", "#BCAAA4", // Brown
  "#616161", "#9E9E9E", "#EEEEEE", // Grey
  "#455A64", "#607D8B", "#B0BEC5", // Blue Grey
];

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

// Task 顯示顏色的繼承規則：
// 有掛 Project → Project 自己的顏色（Personal／Work 都一樣，Project 建立/編輯時
// 本來就能選顏色，calendar 應該要照那個顏色畫，不是每個 Personal 都畫成同一色）
// 沒掛 Project → Personal 預設色／Work fallback 色，依 Area 類型決定
export function resolveTaskColor(params: {
  areaType: "personal" | "work" | null | undefined;
  projectColor?: string | null;
  personalDefaultColor: string;
  workFallbackColor: string;
}): string {
  const { areaType, projectColor, personalDefaultColor, workFallbackColor } = params;
  if (projectColor) return projectColor;
  return areaType === "work" ? workFallbackColor : personalDefaultColor;
}
