"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import { isTaskOverdue } from "@/lib/overdue";
import { useUser } from "./use-user";

// Inbox = 還沒分類的（status='inbox'），加上「遺忘到某一天、期限已到」的那些
// （見規劃書第 13 節：到期後自動回到 Inbox）。無限期遺忘的不會出現在這裡。
export function useInboxTasks() {
  const { user } = useUser();
  const today = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["tasks", "inbox", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .or(`status.eq.inbox,and(status.eq.forgotten,forgotten_until.lte.${today})`)
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

// 還在遺忘中、還沒到期的（無限期，或遺忘到某天但那天還沒到）。
export function useForgottenTasks() {
  const { user } = useUser();
  const today = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["tasks", "forgotten", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "forgotten")
        .is("archived_at", null)
        .or(`forgotten_until.is.null,forgotten_until.gt.${today}`)
        .order("forgotten_until", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

export function useArchivedTasks() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["tasks", "archived", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update({ archived_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaskQueries(queryClient),
  });
}

// 逾期未完成的（算自動遺忘的一種，見 src/lib/overdue.ts）。用「排定日期/Due Date
// 是今天或更早」先在 DB 端縮小範圍，精確判斷交給共用的 isTaskOverdue。
export function useOverdueTasks() {
  const { user } = useUser();
  const today = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ["tasks", "overdue-candidates", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .is("archived_at", null)
        .or(`scheduled_date.lte.${today},due_date.lte.${today}`)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data as Task[]).filter(isTaskOverdue);
    },
    enabled: !!user,
  });
}

export type TaskWithAssignee = Task & { people: { name: string } | null };

// Waiting：已交辦、還沒到 Follow-up 時間（或根本沒設）的任務——單純列出讓你知道還欠什麼。
export function useWaitingTasks() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["tasks", "waiting", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*, people(name)")
        .eq("status", "waiting")
        .is("archived_at", null)
        .order("follow_up_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as TaskWithAssignee[];
    },
    enabled: !!user,
  });
}

// Review：Follow-up 時間已經到了，需要我確認進度的那些。
export function useReviewTasks() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["tasks", "review", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*, people(name)")
        .eq("status", "waiting")
        .lte("follow_up_at", new Date().toISOString())
        .is("archived_at", null)
        .order("follow_up_at", { ascending: true });
      if (error) throw error;
      return data as TaskWithAssignee[];
    },
    enabled: !!user,
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
