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

// Reminder 沒有自己的 area_id/project_id，要透過掛的 Project 換算——沒掛 Project
// 就沒有 Area 可以歸類，跟 Quadrant 用同一套「兩個 toggle 開一個就顯示」規則。
export function useReminderColorResolver() {
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();

  function projectOf(reminder: Reminder): Project | null {
    if (reminder.linked_type !== "project" || !reminder.linked_id) return null;
    return projects?.find((p) => p.id === reminder.linked_id) ?? null;
  }

  function areaTypeOf(reminder: Reminder) {
    const project = projectOf(reminder);
    if (!project) return null;
    return areas?.find((a) => a.id === project.area_id)?.type ?? null;
  }

  function colorOf(reminder: Reminder) {
    return projectOf(reminder)?.color ?? "#9ca3af";
  }

  return { areaTypeOf, colorOf, projectOf };
}
