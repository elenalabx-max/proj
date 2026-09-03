"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useTodoPanelStore } from "@/stores/todo-panel";
import { useReminderPanelStore } from "@/stores/reminder-panel";
import type { Reminder, Task, Todo } from "@/lib/types";

function useCompletedTasks() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["tasks", "completed", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "completed")
        .is("archived_at", null)
        .order("completed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

function useCompletedTodos() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["todos", "completed", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .not("completed_at", "is", null)
        .is("archived_at", null)
        .order("completed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!user,
  });
}

function useCompletedReminders() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["reminders", "completed", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });
}

type Row = { kind: "task" | "todo" | "reminder"; id: string; title: string; completedAt: string | null };

type TabKey = "all" | "todo" | "task" | "reminder";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "todo", label: "Todo" },
  { key: "task", label: "Task" },
  { key: "reminder", label: "Reminder" },
];

export default function CompletedPage() {
  const { data: tasks, isLoading: tasksLoading } = useCompletedTasks();
  const { data: todos, isLoading: todosLoading } = useCompletedTodos();
  const { data: reminders, isLoading: remindersLoading } = useCompletedReminders();
  const openTask = useTaskPanelStore((s) => s.open);
  const openTodo = useTodoPanelStore((s) => s.open);
  const openReminder = useReminderPanelStore((s) => s.open);

  const isLoading = tasksLoading || todosLoading || remindersLoading;

  const rows: Row[] = useMemo(() => {
    // Task 的 completed_at 沒有 DB constraint 強制一定要有值，狀態是 completed
    // 不代表這欄一定不是 null——保留 null，顯示時再擋，不要當成 epoch 硬算日期。
    const taskRows: Row[] = (tasks ?? []).map((t) => ({ kind: "task", id: t.id, title: t.title, completedAt: t.completed_at }));
    const todoRows: Row[] = (todos ?? []).map((t) => ({ kind: "todo", id: t.id, title: t.title, completedAt: t.completed_at }));
    const reminderRows: Row[] = (reminders ?? []).map((r) => ({
      kind: "reminder",
      id: r.id,
      title: r.title ?? r.note ?? "提醒",
      completedAt: r.completed_at,
    }));
    return [...taskRows, ...todoRows, ...reminderRows].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  }, [tasks, todos, reminders]);

  const [tab, setTab] = useState<TabKey>("all");
  const visibleRows = tab === "all" ? rows : rows.filter((r) => r.kind === tab);

  function openRow(row: Row) {
    if (row.kind === "task") openTask(row.id);
    else if (row.kind === "todo") openTodo(row.id);
    else openReminder(row.id);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Completed</h1>
        <p className="mt-1 text-sm text-neutral-500">已經完成的 Task／Todo／提醒（各自最近 200 筆）。</p>
      </div>

      <div className="flex w-fit gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
        {TABS.map((t) => {
          const count = t.key === "all" ? rows.length : rows.filter((r) => r.kind === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded px-3 py-1 text-sm font-medium ${
                tab === t.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t.label}
              {!!count && <span className="ml-1 text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {isLoading && <p className="text-sm text-neutral-500">載入中…</p>}
      {!isLoading && visibleRows.length === 0 && <p className="text-sm text-neutral-400">還沒有完成的項目。</p>}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {visibleRows.map((r) => (
          <button
            key={`${r.kind}:${r.id}`}
            onClick={() => openRow(r)}
            className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-neutral-400">{r.title}</span>
              <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                {r.kind === "task" ? "Task" : r.kind === "todo" ? "Todo" : "提醒"}
              </span>
            </span>
            <span className="shrink-0 text-xs text-neutral-400">
              {r.completedAt ? new Date(r.completedAt).toLocaleDateString("zh-TW") : "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
