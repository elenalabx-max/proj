"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { buildTodoOccurrences, buildRRuleText, getOccurrenceDates, type TodoOccurrence, type RecurrencePattern } from "@/lib/recurrence";
import type { RecurrenceInstance, RecurrenceRule, Todo } from "@/lib/types";
import { useUser } from "./use-user";

type TodoWithRule = Todo & {
  recurrence_rules: { rrule_text: string; starts_on: string; ends_on: string | null } | null;
};

export function useRecurringTodoOccurrences(start: string, end: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ["todo-occurrences", start, end, user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data: todos, error } = await supabase
        .from("todos")
        .select("*, recurrence_rules(rrule_text, starts_on, ends_on)")
        .not("recurrence_rule_id", "is", null)
        .is("archived_at", null);
      if (error) throw error;

      const rows = (todos ?? []) as TodoWithRule[];
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

      const occurrences: TodoOccurrence[] = [];
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
        occurrences.push(...buildTodoOccurrences(row, dates, relevant as RecurrenceInstance[]));
      }
      return occurrences;
    },
    enabled: !!user,
  });
}

export function useSetTodoRecurrence() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      todoId,
      pattern,
      startsOn,
    }: {
      todoId: string;
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

      const { error: todoErr } = await supabase
        .from("todos")
        .update({ recurrence_rule_id: rule.id })
        .eq("id", todoId);
      if (todoErr) throw todoErr;

      return rule as RecurrenceRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todo"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["todo-occurrences"] });
    },
  });
}

export function useClearTodoRecurrence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (todoId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("todos")
        .update({ recurrence_rule_id: null })
        .eq("id", todoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todo"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["todo-occurrences"] });
    },
  });
}

// 只完成/取消單一次發生——絕對不能動到 master todo 或其他次。
export function useSetTodoOccurrenceCompleted() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({
      ruleId,
      todoId,
      date,
      completed,
    }: {
      ruleId: string;
      todoId: string;
      date: string;
      completed: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from("recurrence_instances").upsert(
        {
          user_id: user?.id,
          recurrence_rule_id: ruleId,
          todo_id: todoId,
          instance_date: date,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "recurrence_rule_id,instance_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todo-occurrences"] }),
  });
}

export function useCancelTodoOccurrence() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async ({ ruleId, todoId, date }: { ruleId: string; todoId: string; date: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("recurrence_instances").upsert(
        {
          user_id: user?.id,
          recurrence_rule_id: ruleId,
          todo_id: todoId,
          instance_date: date,
          is_cancelled: true,
        },
        { onConflict: "recurrence_rule_id,instance_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todo-occurrences"] }),
  });
}
