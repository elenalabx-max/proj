"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Reminder, ReminderLinkedType } from "@/lib/types";
import { useUser } from "./use-user";

function invalidateReminders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["reminders"] });
}

export function useRemindersOnDate(date: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ["reminders", "date", date, user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .gte("remind_at", `${date}T00:00:00`)
        .lt("remind_at", `${date}T23:59:59.999`)
        .is("completed_at", null)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });
}

// 已經到時間、還沒完成的提醒——通知鈴鐺用。沒有背景 job 推播，查詢當下直接比對時間就好。
export function useDueReminders() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["reminders", "due", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .is("completed_at", null)
        .lte("remind_at", new Date().toISOString())
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      linkedType,
      linkedId,
      remindAt,
      note,
      title,
    }: {
      linkedType: ReminderLinkedType;
      linkedId?: string | null;
      remindAt: string;
      note?: string;
      title?: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          user_id: user?.id,
          linked_type: linkedType,
          linked_id: linkedId ?? null,
          remind_at: remindAt,
          note: note || null,
          title: title || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => invalidateReminders(queryClient),
  });
}

export function useToggleReminderDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("reminders")
        .update({ completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateReminders(queryClient),
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateReminders(queryClient),
  });
}
