"use client";

import { useAreas } from "./use-areas";
import { useProjects } from "./use-projects";
import { useUserSettings } from "./use-user-settings";
import { resolveTaskColor } from "@/lib/colors";
import type { Task } from "@/lib/types";

// 共用的「這個 Task 的 Area 類型／顯示顏色」查詢邏輯，
// Day/Week/Month/Quadrant 這幾個 Calendar 檢視都要用同一套繼承規則。
export function useTaskColorResolver() {
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();

  function areaTypeOf(task: Task) {
    return areas?.find((a) => a.id === task.area_id)?.type ?? null;
  }

  function colorOf(task: Task) {
    const project = projects?.find((p) => p.id === task.project_id);
    return resolveTaskColor({
      areaType: areaTypeOf(task),
      projectColor: project?.color,
      personalDefaultColor: settings?.personal_default_color ?? "#9a86ac",
      workFallbackColor: settings?.work_fallback_color ?? "#5b7f9a",
    });
  }

  function projectOf(task: Task) {
    return projects?.find((p) => p.id === task.project_id) ?? null;
  }

  return { areas, projects, areaTypeOf, colorOf, projectOf };
}
