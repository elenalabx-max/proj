"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export type TimeLog = {
  id: string;
  user_id: string;
  task_id: string | null;
  subtask_id: string | null;
  todo_id: string | null;
  log_date: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number;
  note: string | null;
  source: "timer" | "manual";
  created_at: string;
  updated_at: string;
};

export function useTimeLogsForTask(taskId: string | null) {
  return useQuery({
    queryKey: ["time_logs", "task", taskId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("time_logs")
        .select("*")
        .eq("task_id", taskId)
        .order("log_date", { ascending: false })
        .order("started_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as TimeLog[];
    },
    enabled: !!taskId,
  });
}

// task_actual_minutes 這個 View 已經把「Task 自己的 log」+「底下 Subtask 的 log」加總好，
// 直接查它比在前端各自加總、容易漏算或重複算更保險（見架構規劃 G 節）。
export function useTaskActualMinutes(taskId: string | null) {
  return useQuery({
    queryKey: ["task_actual_minutes", taskId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("task_actual_minutes")
        .select("actual_minutes")
        .eq("task_id", taskId)
        .maybeSingle();
      if (error) throw error;
      return data?.actual_minutes ?? 0;
    },
    enabled: !!taskId,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, taskId: string | null) {
  queryClient.invalidateQueries({ queryKey: ["time_logs", "task", taskId] });
  queryClient.invalidateQueries({ queryKey: ["task_actual_minutes", taskId] });
}

export type NewTimeLog = {
  task_id: string;
  log_date: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_minutes: number;
  note?: string | null;
  source: "timer" | "manual";
};

export function useCreateTimeLog() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: NewTimeLog) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("time_logs")
        .insert({ ...input, user_id: user?.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as TimeLog;
    },
    onSuccess: (log) => invalidate(queryClient, log.task_id),
  });
}

export function useUpdateTimeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId, patch }: { id: string; taskId: string; patch: Partial<TimeLog> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("time_logs").update(patch).eq("id", id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => invalidate(queryClient, taskId),
  });
}

export function useDeleteTimeLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; taskId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("time_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => invalidate(queryClient, vars.taskId),
  });
}
