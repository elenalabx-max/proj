"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Subtask, Task } from "@/lib/types";
import { useUser } from "./use-user";

export function useSubtasks(taskId: string | null) {
  return useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!taskId,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, taskId: string) {
  queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id: taskId, title, user_id: user?.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: (subtask) => invalidate(queryClient, subtask.task_id),
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId, patch }: { id: string; taskId: string; patch: Partial<Subtask> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("subtasks").update(patch).eq("id", id);
      if (error) throw error;
      return taskId;
    },
    onSuccess: (taskId) => invalidate(queryClient, taskId),
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; taskId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("subtasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => invalidate(queryClient, vars.taskId),
  });
}

// 規劃書第九節：Subtask 需要獨立日期/排程/交辦時可以「轉成 Task」。
// 做法是新建一筆 Task（繼承父 Task 的 project/area），再把 Subtask 刪掉。
export function useConvertSubtaskToTask() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({ subtask, parentTask }: { subtask: Subtask; parentTask: Task }) => {
      const supabase = createClient();
      const { data: newTask, error: insertError } = await supabase
        .from("tasks")
        .insert({
          user_id: user?.id,
          title: subtask.title,
          project_id: parentTask.project_id,
          area_id: parentTask.area_id,
          status: "todo",
        })
        .select("*")
        .single();
      if (insertError) throw insertError;

      const { error: deleteError } = await supabase.from("subtasks").delete().eq("id", subtask.id);
      if (deleteError) throw deleteError;

      return newTask as Task;
    },
    onSuccess: (_data, vars) => {
      invalidate(queryClient, vars.parentTask.id);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
