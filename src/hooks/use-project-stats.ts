"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ProjectStatsRow = {
  id: string;
  title: string;
  estimated: number;
  actual: number;
};

export type ProjectStats = {
  rows: ProjectStatsRow[];
  totalEstimated: number;
  totalActual: number;
};

// task_actual_minutes 是個 View，PostgREST 不會自動幫忙做 embed join，
// 所以分兩次查再自己合併，比硬湊一個查不出來的巢狀 select 更可靠。
export function useProjectStats(projectId: string | null) {
  return useQuery({
    queryKey: ["project_stats", projectId],
    queryFn: async (): Promise<ProjectStats> => {
      const supabase = createClient();

      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, title, estimated_minutes")
        .eq("project_id", projectId)
        .is("archived_at", null);
      if (error) throw error;

      const taskIds = (tasks ?? []).map((t) => t.id);
      const { data: actuals, error: actualsErr } = taskIds.length
        ? await supabase.from("task_actual_minutes").select("task_id, actual_minutes").in("task_id", taskIds)
        : { data: [] as { task_id: string; actual_minutes: number }[], error: null };
      if (actualsErr) throw actualsErr;

      const actualByTask = new Map((actuals ?? []).map((a) => [a.task_id, a.actual_minutes]));

      const rows: ProjectStatsRow[] = (tasks ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        estimated: t.estimated_minutes ?? 0,
        actual: actualByTask.get(t.id) ?? 0,
      }));

      return {
        rows,
        totalEstimated: rows.reduce((sum, r) => sum + r.estimated, 0),
        totalActual: rows.reduce((sum, r) => sum + r.actual, 0),
      };
    },
    enabled: !!projectId,
  });
}
