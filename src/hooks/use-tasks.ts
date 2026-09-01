"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import { useUser } from "./use-user";

export function useInboxTasks() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["tasks", "inbox", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "inbox")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

export function useProjectTasks(projectId: string | null) {
  return useQuery({
    queryKey: ["tasks", "project", projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();
      if (error) throw error;
      return data as Task;
    },
    enabled: !!taskId,
  });
}

export type NewTask = {
  title: string;
  project_id?: string | null;
  area_id?: string | null;
  status?: Task["status"];
  description?: string | null;
  important?: boolean;
  urgent?: boolean;
  due_date?: string | null;
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  is_all_day?: boolean;
};

function invalidateTaskQueries(queryClient: ReturnType<typeof useQueryClient>, task?: Task) {
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  if (task) {
    queryClient.invalidateQueries({ queryKey: ["task", task.id] });
  }
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: NewTask) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ status: "todo", ...input, user_id: user?.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) => invalidateTaskQueries(queryClient, task),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) => invalidateTaskQueries(queryClient, task),
  });
}

export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<Task> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update(patch).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

// 輕量版任務數統計，給 Project 卡片用（Phase 8 才會做完整 Project Statistics）。
export function useTaskCountsByProject() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["task-counts-by-project", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("project_id, status")
        .is("archived_at", null)
        .not("project_id", "is", null);
      if (error) throw error;

      const counts: Record<string, { total: number; completed: number }> = {};
      for (const row of data as { project_id: string; status: Task["status"] }[]) {
        const bucket = (counts[row.project_id] ??= { total: 0, completed: 0 });
        bucket.total += 1;
        if (row.status === "completed") bucket.completed += 1;
      }
      return counts;
    },
    enabled: !!user,
  });
}

export function useArchiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}
