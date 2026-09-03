"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildReminderOccurrences, buildRRuleText, getOccurrenceDates, type ReminderOccurrence, type RecurrencePattern } from "@/lib/recurrence";
import type { Reminder, RecurrenceInstance, RecurrenceRule } from "@/lib/types";
import { useUser } from "./use-user";

type ReminderWithRule = Reminder & {
  recurrence_rules: { rrule_text: string; starts_on: string; ends_on: string | null } | null;
};

export function useRecurringReminderOccurrences(start: string, end: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ["reminder-occurrences", start, end, user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data: reminders, error } = await supabase
        .from("reminders")
        .select("*, recurrence_rules(rrule_text, starts_on, ends_on)")
        .not("recurrence_rule_id", "is", null);
      // Reminder 沒有 archived_at 這個欄位（見十一節），跟 Task/Todo 不一樣——
      // 之前照抄那兩個的查詢寫法多加了 .is("archived_at", null)，這欄不存在，
      // PostgREST 會直接回 400，整個查詢都失敗。
      if (error) throw error;

      const rows = (reminders ?? []) as ReminderWithRule[];
      const ruleIds = rows.map((r) => r.recurrence_rule_id).filter((v): v is string => !!v);

      const { data: instances, error: instErr } = ruleIds.length
        ? await supabase
            .from("recurrence_instances")
            .select("*")
            .in("recurrence_rule_id", ruleIds)
            .gte("instance_date", start)
            .lte("instance_date", end)
        : { data: [] as RecurrenceInstance[], error: null };
      if (instErr) throw instErr;

      const occurrences: ReminderOccurrence[] = [];
      for (const row of rows) {
        if (!row.recurrence_rules || !row.recurrence_rule_id) continue;
        const dates = getOccurrenceDates(
          row.recurrence_rules.rrule_text,
          row.recurrence_rules.starts_on,
          row.recurrence_rules.ends_on,
          start,
          end,
        );
        const relevant = (instances ?? []).filter((i) => i.recurrence_rule_id === row.recurrence_rule_id);
        occurrences.push(...buildReminderOccurrences(row, dates, relevant as RecurrenceInstance[]));
      }
      return occurrences;
    },
    enabled: !!user,
  });
}

export function useSetReminderRecurrence() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      reminderId,
      pattern,
      startsOn,
    }: {
      reminderId: string;
      pattern: RecurrencePattern;
      startsOn: string;
    }) => {
      const supabase = createClient();
      const rrule_text = buildRRuleText(pattern);
      const { data: rule, error: ruleErr } = await supabase
        .from("recurrence_rules")
        .insert({ user_id: user?.id, rrule_text, starts_on: startsOn })
        .select("*")
        .single();
      if (ruleErr) throw ruleErr;

      const { error: reminderErr } = await supabase
        .from("reminders")
        .update({ recurrence_rule_id: rule.id })
        .eq("id", reminderId);
      if (reminderErr) throw reminderErr;

      return rule as RecurrenceRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-occurrences"] });
    },
  });
}

export function useClearReminderRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("reminders")
        .update({ recurrence_rule_id: null })
        .eq("id", reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminder-occurrences"] });
    },
  });
}

// 只完成/取消單一次發生——絕對不能動到 master reminder 或其他次。
export function useSetReminderOccurrenceCompleted() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      ruleId,
      reminderId,
      date,
      completed,
    }: {
      ruleId: string;
      reminderId: string;
      date: string;
      completed: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("recurrence_instances").upsert(
        {
          user_id: user?.id,
          recurrence_rule_id: ruleId,
          reminder_id: reminderId,
          instance_date: date,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "recurrence_rule_id,instance_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminder-occurrences"] }),
  });
}

export function useCancelReminderOccurrence() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({ ruleId, reminderId, date }: { ruleId: string; reminderId: string; date: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("recurrence_instances").upsert(
        {
          user_id: user?.id,
          recurrence_rule_id: ruleId,
          reminder_id: reminderId,
          instance_date: date,
          is_cancelled: true,
        },
        { onConflict: "recurrence_rule_id,instance_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminder-occurrences"] }),
  });
}
