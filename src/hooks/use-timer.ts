"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toISODate } from "@/lib/date";
import { useUser } from "./use-user";

export type ActiveTimer = {
  user_id: string;
  task_id: string | null;
  subtask_id: string | null;
  started_at: string;
  tasks: { title: string } | null;
};

export function useActiveTimer() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["active_timer", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("active_timers")
        .select("*, tasks(title)")
        .maybeSingle();
      if (error) throw error;
      return data as ActiveTimer | null;
    },
    enabled: !!user,
    refetchInterval: 30_000,
  });
}

function invalidateTimer(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["active_timer"] });
  queryClient.invalidateQueries({ queryKey: ["time_logs"] });
  queryClient.invalidateQueries({ queryKey: ["task_actual_minutes"] });
}

// 停止目前的計時器，把經過的時間寫成一筆 Time Log（source='timer'）。
async function stopActiveTimer(userId: string) {
  const supabase = createClient();
  const { data: active } = await supabase.from("active_timers").select("*").maybeSingle();
  if (!active || !active.task_id) {
    await supabase.from("active_timers").delete().eq("user_id", userId);
    return;
  }

  const startedAt = new Date(active.started_at);
  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

  const { error: logError } = await supabase.from("time_logs").insert({
    user_id: userId,
    task_id: active.task_id,
    subtask_id: active.subtask_id,
    log_date: toISODate(startedAt),
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    duration_minutes: durationMinutes,
    source: "timer",
  });
  if (logError) throw logError;

  const { error: deleteError } = await supabase.from("active_timers").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;
}

// 同一個使用者同時只能有一個 Active Timer（active_timers.user_id 是 PK）。
// 如果已經有別的在跑，要先停掉（變成一筆 Time Log）才能開新的。
export function useStartTimer() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!user) return;
      const supabase = createClient();

      const { data: existing } = await supabase
        .from("active_timers")
        .select("*, tasks(title)")
        .maybeSingle();

      if (existing && existing.task_id !== taskId) {
        const ok = window.confirm(
          `目前正在計時「${existing.tasks?.title ?? "某個任務"}」，是否停止並切換？`,
        );
        if (!ok) return;
        await stopActiveTimer(user.id);
      } else if (existing && existing.task_id === taskId) {
        return; // 已經在計這個 task 了
      }

      const { error } = await supabase
        .from("active_timers")
        .insert({ user_id: user.id, task_id: taskId, started_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => invalidateTimer(queryClient),
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      await stopActiveTimer(user.id);
    },
    onSuccess: () => invalidateTimer(queryClient),
  });
}
