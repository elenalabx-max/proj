"use client";

import { useMemo } from "react";
import { useForgottenTasks, useUpdateTask } from "@/hooks/use-tasks";
import { useForgottenTodos, useUpdateTodo } from "@/hooks/use-todos";
import type { Task, Todo } from "@/lib/types";

const FOREVER = "9999-12-31";

type Row = { kind: "todo"; id: string; title: string; data: Todo } | { kind: "task"; id: string; title: string; data: Task };

function fmtForgottenUntil(iso: string | null) {
  if (!iso) return "無限期";
  if (iso >= FOREVER) return "無限期";
  return `到 ${iso}`;
}

export default function ForgottenPage() {
  const { data: tasks, isLoading: tasksLoading } = useForgottenTasks();
  const { data: todos, isLoading: todosLoading } = useForgottenTodos();
  const updateTask = useUpdateTask();
  const updateTodo = useUpdateTodo();

  const rows: Row[] = useMemo(() => {
    const taskRows: Row[] = (tasks ?? []).map((t) => ({ kind: "task", id: t.id, title: t.title, data: t }));
    const todoRows: Row[] = (todos ?? []).map((t) => ({ kind: "todo", id: t.id, title: t.title, data: t }));
    return [...taskRows, ...todoRows];
  }, [tasks, todos]);

  function restore(row: Row) {
    if (row.kind === "task") {
      updateTask.mutate({ id: row.id, patch: { status: "inbox", forgotten_until: null } });
    } else {
      updateTodo.mutate({ id: row.id, patch: { forgotten_until: null } });
    }
  }

  const loading = tasksLoading || todosLoading;

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
          <div key={`${r.kind}:${r.id}`} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-900">{r.title}</span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                {r.kind === "todo" ? "Todo" : "Task"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-neutral-400">{fmtForgottenUntil(r.data.forgotten_until)}</span>
              <button onClick={() => restore(r)} className="font-medium text-neutral-500 hover:text-neutral-900 hover:underline">
                取消遺忘
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
