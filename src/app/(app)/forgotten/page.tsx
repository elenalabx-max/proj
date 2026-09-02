"use client";

import { useMemo } from "react";
import { useForgottenTasks, useOverdueTasks, useUpdateTask } from "@/hooks/use-tasks";
import { useForgottenTodos, useOverdueTodos, useUpdateTodo } from "@/hooks/use-todos";
import { useOverdueReminders } from "@/hooks/use-reminders";
import { useReminderPanelStore } from "@/stores/reminder-panel";
import type { Reminder, Task, Todo } from "@/lib/types";

const FOREVER = "9999-12-31";

type Row =
  | { kind: "todo"; id: string; title: string; data: Todo; auto: boolean }
  | { kind: "task"; id: string; title: string; data: Task; auto: boolean }
  | { kind: "reminder"; id: string; title: string; data: Reminder; auto: true };

function fmtForgottenUntil(iso: string | null) {
  if (!iso) return "無限期";
  if (iso >= FOREVER) return "無限期";
  return `到 ${iso}`;
}

function localDateOf(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ForgottenPage() {
  const { data: tasks, isLoading: tasksLoading } = useForgottenTasks();
  const { data: todos, isLoading: todosLoading } = useForgottenTodos();
  const { data: overdueTasks, isLoading: overdueTasksLoading } = useOverdueTasks();
  const { data: overdueTodos, isLoading: overdueTodosLoading } = useOverdueTodos();
  const { data: overdueReminders, isLoading: overdueRemindersLoading } = useOverdueReminders();
  const updateTask = useUpdateTask();
  const updateTodo = useUpdateTodo();
  const openReminder = useReminderPanelStore((s) => s.open);

  const rows: Row[] = useMemo(() => {
    const taskRows: Row[] = (tasks ?? []).map((t) => ({ kind: "task", id: t.id, title: t.title, data: t, auto: false }));
    const todoRows: Row[] = (todos ?? []).map((t) => ({ kind: "todo", id: t.id, title: t.title, data: t, auto: false }));
    const overdueTaskRows: Row[] = (overdueTasks ?? []).map((t) => ({ kind: "task", id: t.id, title: t.title, data: t, auto: true }));
    const overdueTodoRows: Row[] = (overdueTodos ?? []).map((t) => ({ kind: "todo", id: t.id, title: t.title, data: t, auto: true }));
    const overdueReminderRows: Row[] = (overdueReminders ?? []).map((r) => ({
      kind: "reminder",
      id: r.id,
      title: r.title ?? r.note ?? "提醒",
      data: r,
      auto: true,
    }));
    return [...taskRows, ...todoRows, ...overdueTaskRows, ...overdueTodoRows, ...overdueReminderRows];
  }, [tasks, todos, overdueTasks, overdueTodos, overdueReminders]);

  function restore(row: Row) {
    if (row.kind === "task") {
      // 自動遺忘（逾期）的沒有 forgotten_until 可清，要連日期一起清掉才不會一移回
      // Inbox 又立刻被判定成逾期。
      updateTask.mutate({
        id: row.id,
        patch: row.auto
          ? { status: "inbox", due_date: null, scheduled_date: null, scheduled_start: null, scheduled_end: null }
          : { status: "inbox", forgotten_until: null },
      });
    } else if (row.kind === "todo") {
      updateTodo.mutate({ id: row.id, patch: row.auto ? { date: null } : { forgotten_until: null } });
    } else {
      // Reminder 沒有「無日期」狀態可以清，直接打開面板讓你自己決定要改時間還是勾完成。
      openReminder(row.id);
    }
  }

  const loading = tasksLoading || todosLoading || overdueTasksLoading || overdueTodosLoading || overdueRemindersLoading;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Forgotten</h1>
        <p className="mt-1 text-sm text-neutral-500">
          還沒完成，但現在不想看到的事情。到期會自動回到 Inbox，這裡不會一直顯示未完成數量提醒你。
        </p>
      </div>

      {loading && <p className="text-sm text-neutral-500">載入中…</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-neutral-400">遺忘箱是空的。</p>}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {rows.map((r) => (
          <div key={`${r.kind}:${r.auto ? "auto" : "manual"}:${r.id}`} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-900">{r.title}</span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                {r.kind === "todo" ? "Todo" : r.kind === "task" ? "Task" : "Reminder"}
              </span>
              {r.auto && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">逾期</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-neutral-400">
                {!r.auto
                  ? fmtForgottenUntil(r.data.forgotten_until)
                  : r.kind === "task"
                    ? `逾期 ${r.data.due_date ?? r.data.scheduled_date}`
                    : r.kind === "todo"
                      ? `逾期 ${r.data.date}`
                      : `逾期 ${localDateOf(r.data.remind_at)}`}
              </span>
              <button onClick={() => restore(r)} className="font-medium text-neutral-500 hover:text-neutral-900 hover:underline">
                {r.kind === "reminder" ? "開啟" : r.auto ? "移回 Inbox" : "取消遺忘"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
