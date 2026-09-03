"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useClearRecurrence, useSetRecurrence } from "@/hooks/use-recurrence";
import { describeRRuleText, parseRRuleText, WEEKDAY_ZH, type RecurrencePattern } from "@/lib/recurrence";
import { todayISODate } from "@/lib/date";
import type { Task } from "@/lib/types";

function useRule(ruleId: string | null) {
  return useQuery({
    queryKey: ["recurrence_rule", ruleId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("recurrence_rules")
        .select("rrule_text, starts_on, ends_on")
        .eq("id", ruleId)
        .single();
      if (error) throw error;
      return data as { rrule_text: string; starts_on: string; ends_on: string | null };
    },
    enabled: !!ruleId,
  });
}

export function RepeatSection({ task }: { task: Task }) {
  const setRecurrence = useSetRecurrence();
  const clearRecurrence = useClearRecurrence();
  const { data: rule } = useRule(task.recurrence_rule_id);

  const [freq, setFreq] = useState<RecurrencePattern["freq"]>("weekly");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [monthDay, setMonthDay] = useState(1);
  const [startsOn, setStartsOn] = useState(task.scheduled_date ?? todayISODate());
  const [endsOn, setEndsOn] = useState("");
  const [editing, setEditing] = useState(false);

  // 編輯既有規則時把目前的頻率/週幾/起迄日期都預填回表單，不用重新選一次。
  function startEdit() {
    if (rule) {
      const pattern = parseRRuleText(rule.rrule_text);
      setFreq(pattern.freq);
      setWeekdays(pattern.freq === "weekly" ? pattern.weekdays : []);
      setMonthDay(pattern.freq === "monthly" ? pattern.day : 1);
      setStartsOn(rule.starts_on);
      setEndsOn(rule.ends_on ?? "");
    }
    setEditing(true);
  }

  function handleSave() {
    let pattern: RecurrencePattern;
    if (freq === "weekly") pattern = { freq: "weekly", weekdays: weekdays.length ? weekdays : [0] };
    else if (freq === "monthly") pattern = { freq: "monthly", day: monthDay };
    else pattern = { freq };
    setRecurrence.mutate({ taskId: task.id, pattern, startsOn, endsOn: endsOn || null });
    setEditing(false);
  }

  if (task.recurrence_rule_id && !editing) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">Repeat</label>
        <div className="space-y-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-900">{rule ? describeRRuleText(rule.rrule_text) : "重複中…"}</span>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={startEdit} className="text-neutral-500 hover:underline">
                編輯
              </button>
              <button onClick={() => clearRecurrence.mutate(task.id)} className="text-red-500 hover:underline">
                取消重複
              </button>
            </div>
          </div>
          {rule && (
            <p className="text-[11px] text-neutral-400">
              {rule.starts_on} 開始{rule.ends_on ? `，${rule.ends_on} 結束` : "，不限期"}
            </p>
          )}
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

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] text-neutral-400">起始日期</label>
          <input
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[11px] text-neutral-400">結束日期（不填＝不限期）</label>
          <input
            type="date"
            value={endsOn}
            min={startsOn}
            onChange={(e) => setEndsOn(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white"
        >
          設定重複
        </button>
        {task.recurrence_rule_id && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
}
