"use client";

import { useAreas } from "./use-areas";
import { useProjects } from "./use-projects";
import { useUserSettings } from "./use-user-settings";
import { resolveTaskColor } from "@/lib/colors";

// Task 跟 Todo 都是「掛 Area／Project 就能算顏色跟分類」的最小形狀，
// 兩種都能直接丟進來用，不用另外寫一份幾乎一樣的邏輯。
type Colorable = { area_id: string | null; project_id: string | null };

// 共用的「這個 Task／Todo 的 Area 類型／顯示顏色」查詢邏輯，
// Day/Week/Month/Quadrant 這幾個 Calendar 檢視都要用同一套繼承規則。
export function useTaskColorResolver() {
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();

  function areaTypeOf(item: Colorable) {
    return areas?.find((a) => a.id === item.area_id)?.type ?? null;
  }

  function colorOf(item: Colorable) {
    const project = projects?.find((p) => p.id === item.project_id);
    return resolveTaskColor({
      areaType: areaTypeOf(item),
      projectColor: project?.color,
      personalDefaultColor: settings?.personal_default_color ?? "#9a86ac",
      workFallbackColor: settings?.work_fallback_color ?? "#5b7f9a",
    });
  }

  function projectOf(item: Colorable) {
    return projects?.find((p) => p.id === item.project_id) ?? null;
  }

  return { areas, projects, areaTypeOf, colorOf, projectOf };
}
