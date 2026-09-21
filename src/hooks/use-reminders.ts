"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isReminderOverdue } from "@/lib/overdue";
import type { Reminder, ReminderLinkedType } from "@/lib/types";
import { useUser } from "./use-user";

// 只 invalidate 「reminders」（複數，列表查詢）漏掉了 useReminder(id) 用的
// 「reminder」（單數）——面板打開中改任何欄位，資料庫確實寫進去了，但面板
// 自己讀的是沒被 invalidate 的舊快取，看起來像「按了沒反應」，要關掉面板
// 重開才會看到最新的值。兩個 key 都要 invalidate。
function invalidateReminders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["reminders"] });
  queryClient.invalidateQueries({ queryKey: ["reminder"] });
}

export function useProjectReminders(projectId: string | null) {
  return useQuery({
    queryKey: ["reminders", "project", projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("linked_type", "project")
        .eq("linked_id", projectId)
        .order("remind_at", { ascending: false });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!projectId,
  });
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
        .gte("remind_at", localDayStartISO(date))
        .lte("remind_at", localDayEndISO(date))
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });
}

// 「這一天」的邊界要用使用者本地時區換算成真正的時間點再去比對 timestamptz
// 欄位——直接拿 "2026-09-16T00:00:00" 這種沒有時區的字串去比，Postgres 會當成
// UTC，台灣時間 00:00–07:59 的提醒就會被算到前一天去、當天查不到。
function localDayStartISO(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}
function localDayEndISO(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

// Calendar（Today/3-Days 時間軸、Week、Month）用：不限定要掛 Project——有自己的
// area_id（個人/工作）就知道該畫在哪一欄，沒有 Area 也沒有 Project 才會不顯示。
export function useRemindersInRange(start: string, end: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ["reminders", "range", start, end, user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .gte("remind_at", localDayStartISO(start))
        .lte("remind_at", localDayEndISO(end))
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });
}

// 逾期未完成的提醒（時間點過了、跨過 0 點）——算自動遺忘的一種，見 lib/overdue.ts。
export function useOverdueReminders() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["reminders", "overdue", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .is("completed_at", null)
        .is("recurrence_rule_id", null)
        .lt("remind_at", new Date().toISOString())
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return (data as Reminder[]).filter(isReminderOverdue);
    },
    enabled: !!user,
  });
}

export function useReminder(id: string | null) {
  return useQuery({
    queryKey: ["reminder", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("reminders").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Reminder;
    },
    enabled: !!id,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      linkedType,
      linkedId,
      areaId,
      remindAt,
      note,
      title,
      isAllDay,
    }: {
      linkedType: ReminderLinkedType;
      linkedId?: string | null;
      areaId?: string | null;
      remindAt: string;
      note?: string;
      title?: string;
      isAllDay?: boolean;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          user_id: user?.id,
          linked_type: linkedType,
          linked_id: linkedId ?? null,
          area_id: areaId ?? null,
          remind_at: remindAt,
          note: note || null,
          title: title || null,
          is_all_day: isAllDay ?? false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => invalidateReminders(queryClient),
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Reminder> }) => {
      const supabase = createClient();
      const { error } = await supabase.from("reminders").update(patch).eq("id", id);
      if (error) throw error;
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
