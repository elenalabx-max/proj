"use client";

import { useAreas } from "./use-areas";
import { useProjects } from "./use-projects";
import { useUserSettings } from "./use-user-settings";
import { resolveTaskColor } from "@/lib/colors";
import type { Project, Reminder } from "@/lib/types";

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

// Reminder 自己有 area_id（個人/工作），Project 是透過 linked_type='project'
// 掛的。Area 以提醒自己的為準，沒設才退回掛的 Project 所屬的 Area（舊資料）；
// 顏色跟 Task 一樣：有 Project 用 Project 色，沒有就用該 Area 的預設色。
// Area 跟 Project 都沒有的才算「未分類」，顏色用灰色。
export function useReminderColorResolver() {
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();

  function projectOf(reminder: Reminder): Project | null {
    if (reminder.linked_type !== "project" || !reminder.linked_id) return null;
    return projects?.find((p) => p.id === reminder.linked_id) ?? null;
  }

  function areaTypeOf(reminder: Reminder) {
    const areaId = reminder.area_id ?? projectOf(reminder)?.area_id ?? null;
    if (!areaId) return null;
    return areas?.find((a) => a.id === areaId)?.type ?? null;
  }

  function colorOf(reminder: Reminder) {
    const project = projectOf(reminder);
    const areaType = areaTypeOf(reminder);
    if (!project && !areaType) return "#9ca3af";
    return resolveTaskColor({
      areaType,
      projectColor: project?.color,
      personalDefaultColor: settings?.personal_default_color ?? "#9a86ac",
      workFallbackColor: settings?.work_fallback_color ?? "#5b7f9a",
    });
  }

  return { areaTypeOf, colorOf, projectOf };
}
