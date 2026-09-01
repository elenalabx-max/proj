"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Task, Todo } from "@/lib/types";
import { useUser } from "./use-user";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Inbox = 沒有日期、沒有被遺忘（或遺忘已到期）、還沒完成的 Todo。
// 「遺忘到期回到 Inbox」不用背景 job，查詢當下直接判斷。
export function useInboxTodos() {
  const { user } = useUser();
  const today = todayISO();

  return useQuery({
    queryKey: ["todos", "inbox", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .is("date", null)
        .is("completed_at", null)
        .is("archived_at", null)
        .or(`forgotten_until.is.null,forgotten_until.lte.${today}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!user,
  });
}

function invalidateTodoQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["todos"] });
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (title: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .insert({ title, user_id: user?.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => invalidateTodoQueries(queryClient),
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Todo> }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => invalidateTodoQueries(queryClient),
  });
}

export function useCompleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("todos")
        .update({ completed_at: completed ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTodoQueries(queryClient),
  });
}

// Todo 本身沒有 project_id 欄位（規劃書刻意讓 Todo 保持極簡）。
// 「加入專案」等於把它升級成 Task：建一筆對應的 Task，
// 再把原本的 Todo 存檔（不是刪除，符合「不要 Hard Delete」原則）。
export function useConvertTodoToTask() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      todo,
      project_id,
      area_id,
    }: {
      todo: Todo;
      project_id: string;
      area_id: string;
    }) => {
      const supabase = createClient();

      const { data: task, error: insertError } = await supabase
        .from("tasks")
        .insert({
          user_id: user?.id,
          title: todo.title,
          project_id,
          area_id,
          status: "todo",
        })
        .select("*")
        .single();
      if (insertError) throw insertError;

      const { error: archiveError } = await supabase
        .from("todos")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", todo.id);
      if (archiveError) throw archiveError;

      return task as Task;
    },
    onSuccess: () => invalidateTodoQueries(queryClient),
  });
}
