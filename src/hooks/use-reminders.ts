"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Reminder, ReminderLinkedType } from "@/lib/types";
import { useUser } from "./use-user";

export function useReminders(linkedType: ReminderLinkedType, linkedId: string | null) {
  return useQuery({
    queryKey: ["reminders", linkedType, linkedId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("linked_type", linkedType)
        .eq("linked_id", linkedId)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!linkedId,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, linkedType: ReminderLinkedType, linkedId: string) {
  queryClient.invalidateQueries({ queryKey: ["reminders", linkedType, linkedId] });
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
    }: {
      linkedType: ReminderLinkedType;
      linkedId: string;
      remindAt: string;
      note?: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .insert({
          user_id: user?.id,
          linked_type: linkedType,
          linked_id: linkedId,
          remind_at: remindAt,
          note: note || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: (reminder) => invalidate(queryClient, reminder.linked_type!, reminder.linked_id!),
  });
}

export function useToggleReminderDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean; linkedType: ReminderLinkedType; linkedId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("reminders")
        .update({ completed_at: done ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => invalidate(queryClient, vars.linkedType, vars.linkedId),
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; linkedType: ReminderLinkedType; linkedId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => invalidate(queryClient, vars.linkedType, vars.linkedId),
  });
}
