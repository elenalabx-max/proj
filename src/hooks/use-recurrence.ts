"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildOccurrences, buildRRuleText, getOccurrenceDates, type Occurrence, type RecurrencePattern } from "@/lib/recurrence";
import type { RecurrenceInstance, RecurrenceRule, Task } from "@/lib/types";
import { useUser } from "./use-user";

type TaskWithRule = Task & {
  recurrence_rules: { rrule_text: string; starts_on: string; ends_on: string | null } | null;
};

// 展開所有重複任務在 [start, end] 範圍內的發生日期，套上例外（完成/改內容/取消）。
// 目前只有 Day View 在用；Week/Month 還沒接（見架構規劃 Phase 5 範圍說明）。
export function useRecurringOccurrences(start: string, end: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ["occurrences", start, end, user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*, recurrence_rules(rrule_text, starts_on, ends_on)")
        .not("recurrence_rule_id", "is", null)
        .is("archived_at", null);
      if (error) throw error;

      const rows = (tasks ?? []) as TaskWithRule[];
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

      const occurrences: Occurrence[] = [];
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
        occurrences.push(...buildOccurrences(row, dates, relevant as RecurrenceInstance[]));
      }
      return occurrences;
    },
    enabled: !!user,
  });
}

export function useSetRecurrence() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      taskId,
      pattern,
      startsOn,
      endsOn,
    }: {
      taskId: string;
      pattern: RecurrencePattern;
      startsOn: string;
      endsOn?: string | null;
    }) => {
      const supabase = createClient();
      const rrule_text = buildRRuleText(pattern);
      const { data: rule, error: ruleErr } = await supabase
        .from("recurrence_rules")
        .insert({ user_id: user?.id, rrule_text, starts_on: startsOn, ends_on: endsOn ?? null })
        .select("*")
        .single();
      if (ruleErr) throw ruleErr;

      const { error: taskErr } = await supabase
        .from("tasks")
        .update({ recurrence_rule_id: rule.id })
        .eq("id", taskId);
      if (taskErr) throw taskErr;

      return rule as RecurrenceRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    },
  });
}

export function useClearRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ recurrence_rule_id: null })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
    },
  });
}

// 只完成/取消單一次發生——絕對不能動到 master task 或其他次。
export function useSetOccurrenceCompleted() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      ruleId,
      taskId,
      date,
      completed,
    }: {
      ruleId: string;
      taskId: string;
      date: string;
      completed: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("recurrence_instances").upsert(
        {
          user_id: user?.id,
          recurrence_rule_id: ruleId,
          task_id: taskId,
          instance_date: date,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "recurrence_rule_id,instance_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["occurrences"] }),
  });
}

export function useCancelOccurrence() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({ ruleId, taskId, date }: { ruleId: string; taskId: string; date: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("recurrence_instances").upsert(
        {
          user_id: user?.id,
          recurrence_rule_id: ruleId,
          task_id: taskId,
          instance_date: date,
          is_cancelled: true,
        },
        { onConflict: "recurrence_rule_id,instance_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["occurrences"] }),
  });
}
