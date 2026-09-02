"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useClearTodoRecurrence, useSetTodoRecurrence } from "@/hooks/use-todo-recurrence";
import { describeRRuleText, WEEKDAY_ZH, type RecurrencePattern } from "@/lib/recurrence";
import { todayISODate } from "@/lib/date";
import type { Todo } from "@/lib/types";

function useRuleText(ruleId: string | null) {
  return useQuery({
    queryKey: ["recurrence_rule", ruleId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("recurrence_rules")
        .select("rrule_text")
        .eq("id", ruleId)
        .single();
      if (error) throw error;
      return data.rrule_text as string;
    },
    enabled: !!ruleId,
  });
}

export function RepeatSection({ todo }: { todo: Todo }) {
  const setRecurrence = useSetTodoRecurrence();
  const clearRecurrence = useClearTodoRecurrence();
  const { data: rruleText } = useRuleText(todo.recurrence_rule_id);

  const [freq, setFreq] = useState<RecurrencePattern["freq"]>("weekly");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [monthDay, setMonthDay] = useState(1);
  const [editing, setEditing] = useState(false);

  function handleSave() {
    const startsOn = todo.date ?? todayISODate();
    let pattern: RecurrencePattern;
    if (freq === "weekly") pattern = { freq: "weekly", weekdays: weekdays.length ? weekdays : [0] };
    else if (freq === "monthly") pattern = { freq: "monthly", day: monthDay };
    else pattern = { freq };
    setRecurrence.mutate({ todoId: todo.id, pattern, startsOn });
    setEditing(false);
  }

  if (todo.recurrence_rule_id && !editing) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Repeat</label>
        <div className="flex items-center justify-between rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs">
          <span className="text-neutral-900">{rruleText ? describeRRuleText(rruleText) : "重複中…"}</span>
          <button onClick={() => clearRecurrence.mutate(todo.id)} className="text-red-500 hover:underline">
            取消重複
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-medium text-neutral-500">Repeat</label>
      <select
        value={freq}
        onChange={(e) => setFreq(e.target.value as RecurrencePattern["freq"])}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
      >
        <option value="daily">每天</option>
        <option value="weekly">每週</option>
        <option value="monthly">每月</option>
        <option value="yearly">每年</option>
      </select>

      {freq === "weekly" && (
        <div className="flex flex-wrap gap-1">
          {WEEKDAY_ZH.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                setWeekdays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]))
              }
              className={`h-6 w-6 rounded-full text-[11px] ${
                weekdays.includes(idx) ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {freq === "monthly" && (
        <input
          type="number"
          min={1}
          max={31}
          value={monthDay}
          onChange={(e) => setMonthDay(Number(e.target.value))}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
        />
      )}

      <button
        onClick={handleSave}
        className="w-full rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white"
      >
        設定重複
      </button>
    </div>
  );
}
