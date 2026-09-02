"use client";

import { useMemo, useState } from "react";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useInboxTodos, useUpdateTodo } from "@/hooks/use-todos";
import { useInboxTasks, useUpdateTask, useBulkUpdateTasks } from "@/hooks/use-tasks";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useTodoPanelStore } from "@/stores/todo-panel";
import { CheckboxIcon } from "@/components/ui/checkbox";
import { toISODate } from "@/lib/date";
import type { Task, Todo } from "@/lib/types";

type Row =
  | { kind: "todo"; id: string; title: string; data: Todo }
  | { kind: "task"; id: string; title: string; data: Task };

const FORGOTTEN_FOREVER = "9999-12-31";

// 一定要用本地時區算「今天/明天」，不要用 toISOString()（那是 UTC，台灣時間
// 半夜到早上 8 點前這段 UTC 還沒跨過日期，「明天」會算成「今天」）。
function isoDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toISODate(d);
}

export default function InboxPage() {
  const { data: todos, isLoading: todosLoading } = useInboxTodos();
  const { data: tasks, isLoading: tasksLoading } = useInboxTasks();
  const { data: projects } = useProjects();
  const { data: areas } = useAreas();

  const updateTodo = useUpdateTodo();
  const updateTask = useUpdateTask();
  const bulkUpdateTasks = useBulkUpdateTasks();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState<"date" | "project" | "forget" | null>(null);

  const rows: Row[] = useMemo(() => {
    const todoRows: Row[] = (todos ?? []).map((t) => ({ kind: "todo", id: t.id, title: t.title, data: t }));
    const taskRows: Row[] = (tasks ?? []).map((t) => ({ kind: "task", id: t.id, title: t.title, data: t }));
    return [...todoRows, ...taskRows].sort(
      (a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime(),
    );
  }, [todos, tasks]);

  function key(r: Row) {
    return `${r.kind}:${r.id}`;
  }

  function toggle(r: Row) {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = key(r);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function scheduleRow(r: Row, date: string) {
    if (r.kind === "todo") {
      await updateTodo.mutateAsync({ id: r.id, patch: { date } });
    } else {
      await updateTask.mutateAsync({ id: r.id, patch: { scheduled_date: date, status: "todo" } });
    }
  }

  async function forgetRow(r: Row, forgottenUntil: string) {
    if (r.kind === "todo") {
      await updateTodo.mutateAsync({ id: r.id, patch: { forgotten_until: forgottenUntil } });
    } else {
      await updateTask.mutateAsync({
        id: r.id,
        patch: { status: "forgotten", forgotten_until: forgottenUntil },
      });
    }
  }

  async function assignProjectToRow(r: Row, projectId: string) {
    const project = projects?.find((p) => p.id === projectId);
    if (!project) return;
    if (r.kind === "todo") {
      // Todo 掛 Project 只是貼標籤，不會因此升級成 Task（還是留在 Inbox 之外要自己排日期）。
      await updateTodo.mutateAsync({ id: r.id, patch: { project_id: project.id, area_id: project.area_id } });
    } else {
      await updateTask.mutateAsync({
        id: r.id,
        patch: { project_id: project.id, area_id: project.area_id, status: "todo" },
      });
    }
  }

  async function applyBatch(action: "today" | "tomorrow" | "date" | "project" | "forget-forever" | "forget-date", value?: string) {
    const selectedRows = rows.filter((r) => selected.has(key(r)));
    const taskIds = selectedRows.filter((r) => r.kind === "task").map((r) => r.id);

    if (action === "today" || action === "tomorrow" || action === "date") {
      const date = action === "today" ? isoDate(0) : action === "tomorrow" ? isoDate(1) : value!;
      if (taskIds.length) {
        await bulkUpdateTasks.mutateAsync({ ids: taskIds, patch: { scheduled_date: date, status: "todo" } });
      }
      await Promise.all(
        selectedRows.filter((r) => r.kind === "todo").map((r) => updateTodo.mutateAsync({ id: r.id, patch: { date } })),
      );
    } else if (action === "project" && value) {
      await Promise.all(selectedRows.map((r) => assignProjectToRow(r, value)));
    } else if (action === "forget-forever" || action === "forget-date") {
      const date = action === "forget-forever" ? FORGOTTEN_FOREVER : value!;
      await Promise.all(selectedRows.map((r) => forgetRow(r, date)));
    }

    setSelected(new Set());
    setBatchMode(null);
  }

  const loading = todosLoading || tasksLoading;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Inbox</h1>
        <p className="mt-1 text-sm text-neutral-500">想到事情，但還沒決定怎麼安排。</p>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
          <span className="font-medium text-neutral-700">已選 {selected.size} 項</span>
          <button onClick={() => applyBatch("today")} className="rounded border border-neutral-300 bg-white px-2 py-1 hover:bg-neutral-100">
            今天
          </button>
          <button onClick={() => applyBatch("tomorrow")} className="rounded border border-neutral-300 bg-white px-2 py-1 hover:bg-neutral-100">
            明天
          </button>
          <button onClick={() => setBatchMode(batchMode === "date" ? null : "date")} className="rounded border border-neutral-300 bg-white px-2 py-1 hover:bg-neutral-100">
            選日期
          </button>
          <button onClick={() => setBatchMode(batchMode === "project" ? null : "project")} className="rounded border border-neutral-300 bg-white px-2 py-1 hover:bg-neutral-100">
            加入專案
          </button>
          <button onClick={() => applyBatch("forget-forever")} className="rounded border border-neutral-300 bg-white px-2 py-1 hover:bg-neutral-100">
            遺忘
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-neutral-400 hover:text-neutral-700">
            取消選取
          </button>

          {batchMode === "date" && (
            <input
              type="date"
              autoFocus
              onChange={(e) => e.target.value && applyBatch("date", e.target.value)}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            />
          )}
          {batchMode === "project" && (
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => e.target.value && applyBatch("project", e.target.value)}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            >
              <option value="" disabled>
                選 Project…
              </option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {loading && <p className="text-sm text-neutral-500">載入中…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-neutral-400">收集箱是空的。</p>
      )}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {rows.map((r) => (
          <InboxRow
            key={key(r)}
            row={r}
            checked={selected.has(key(r))}
            onToggle={() => toggle(r)}
            onSchedule={(date) => scheduleRow(r, date)}
            onForget={(date) => forgetRow(r, date)}
            onAssignProject={(projectId) => assignProjectToRow(r, projectId)}
            projects={projects ?? []}
          />
        ))}
      </div>
      {areas && areas.length === 0 && (
        <p className="text-xs text-neutral-400">找不到 areas 資料，請確認 migration 已執行。</p>
      )}
    </div>
  );
}

function InboxRow({
  row,
  checked,
  onToggle,
  onSchedule,
  onForget,
  onAssignProject,
  projects,
}: {
  row: Row;
  checked: boolean;
  onToggle: () => void;
  onSchedule: (date: string) => void;
  onForget: (date: string) => void;
  onAssignProject: (projectId: string) => void;
  projects: { id: string; name: string }[];
}) {
  const [mode, setMode] = useState<"date" | "project" | "forget" | null>(null);

  const openTask = useTaskPanelStore((s) => s.open);
  const openTodo = useTodoPanelStore((s) => s.open);

  return (
    <div className="flex flex-col gap-1.5 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button type="button" role="checkbox" aria-checked={checked} onClick={onToggle}>
          <CheckboxIcon checked={checked} />
        </button>

        <button
          onClick={() => (row.kind === "task" ? openTask(row.id) : openTodo(row.id))}
          className="flex-1 truncate text-left text-sm text-neutral-900 hover:underline"
          title={`點擊開啟 ${row.kind === "task" ? "Task" : "Todo"} 詳細內容`}
        >
          {row.title}
        </button>

        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
          {row.kind === "todo" ? "Todo" : "Task"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-7 text-xs text-neutral-500">
        <button onClick={() => onSchedule(isoDate(0))} className="hover:text-neutral-900 hover:underline">
          今天
        </button>
        <button onClick={() => onSchedule(isoDate(1))} className="hover:text-neutral-900 hover:underline">
          明天
        </button>
        <button onClick={() => setMode(mode === "date" ? null : "date")} className="hover:text-neutral-900 hover:underline">
          選日期
        </button>
        <button onClick={() => setMode(mode === "project" ? null : "project")} className="hover:text-neutral-900 hover:underline">
          加入專案
        </button>
        <button onClick={() => setMode(mode === "forget" ? null : "forget")} className="hover:text-neutral-900 hover:underline">
          遺忘
        </button>

        {mode === "date" && (
          <input
            type="date"
            autoFocus
            onChange={(e) => {
              if (e.target.value) {
                onSchedule(e.target.value);
                setMode(null);
              }
            }}
            className="rounded border border-neutral-300 px-1.5 py-0.5"
          />
        )}
        {mode === "project" && (
          <select
            autoFocus
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onAssignProject(e.target.value);
                setMode(null);
              }
            }}
            className="rounded border border-neutral-300 px-1.5 py-0.5"
          >
            <option value="" disabled>
              選 Project…
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        {mode === "forget" && (
          <span className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onForget(FORGOTTEN_FOREVER);
                setMode(null);
              }}
              className="rounded border border-neutral-300 px-1.5 py-0.5 hover:bg-neutral-100"
            >
              無限期
            </button>
            <input
              type="date"
              onChange={(e) => {
                if (e.target.value) {
                  onForget(e.target.value);
                  setMode(null);
                }
              }}
              className="rounded border border-neutral-300 px-1.5 py-0.5"
            />
          </span>
        )}
      </div>
    </div>
  );
}
