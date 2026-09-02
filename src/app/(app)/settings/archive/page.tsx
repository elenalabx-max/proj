"use client";

import { useState } from "react";
import { useArchivedTasks, useRestoreTask, useDeleteTaskForever } from "@/hooks/use-tasks";
import { useArchivedProjects, useRestoreProject, useDeleteProjectForever } from "@/hooks/use-projects";
import { useArchivedTodos, useRestoreTodo, useDeleteTodoForever } from "@/hooks/use-todos";
import { CheckboxIcon } from "@/components/ui/checkbox";

type TabKey = "projects" | "tasks" | "todos";
type ArchiveItem = { id: string; title: string };

export default function ArchivePage() {
  const { data: tasks } = useArchivedTasks();
  const { data: projects } = useArchivedProjects();
  const { data: todos } = useArchivedTodos();
  const restoreTask = useRestoreTask();
  const restoreProject = useRestoreProject();
  const restoreTodo = useRestoreTodo();
  const deleteTaskForever = useDeleteTaskForever();
  const deleteProjectForever = useDeleteProjectForever();
  const deleteTodoForever = useDeleteTodoForever();

  const [tab, setTab] = useState<TabKey>("projects");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tabs: {
    key: TabKey;
    label: string;
    items: ArchiveItem[];
    restore: (id: string) => Promise<unknown>;
    deleteForever: (id: string) => Promise<unknown>;
  }[] = [
    {
      key: "projects",
      label: "Projects",
      items: (projects ?? []).map((p) => ({ id: p.id, title: p.name })),
      restore: (id) => restoreProject.mutateAsync(id),
      deleteForever: (id) => deleteProjectForever.mutateAsync(id),
    },
    {
      key: "tasks",
      label: "Tasks",
      items: (tasks ?? []).map((t) => ({ id: t.id, title: t.title })),
      restore: (id) => restoreTask.mutateAsync(id),
      deleteForever: (id) => deleteTaskForever.mutateAsync(id),
    },
    {
      key: "todos",
      label: "Todos",
      items: (todos ?? []).map((t) => ({ id: t.id, title: t.title })),
      restore: (id) => restoreTodo.mutateAsync(id),
      deleteForever: (id) => deleteTodoForever.mutateAsync(id),
    },
  ];

  const current = tabs.find((t) => t.key === tab)!;
  const totalArchived = tabs.reduce((sum, t) => sum + t.items.length, 0);

  function switchTab(key: TabKey) {
    setTab(key);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function restoreSelected() {
    await Promise.all([...selected].map((id) => current.restore(id)));
    setSelected(new Set());
  }

  async function deleteSelectedForever() {
    if (!window.confirm(`永久刪除選取的 ${selected.size} 項？這個動作沒辦法復原。`)) return;
    await Promise.all([...selected].map((id) => current.deleteForever(id)));
    setSelected(new Set());
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">封存 Archive</h1>
        <p className="mt-1 text-sm text-neutral-500">
          刪除的東西都先存在這裡，不會直接消失。點「復原」可以救回來。
        </p>
      </div>

      <div className="flex w-fit gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`rounded px-3 py-1 text-sm font-medium ${
              tab === t.key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t.label}
            {!!t.items.length && <span className="ml-1 text-xs opacity-70">({t.items.length})</span>}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
          <span className="font-medium text-neutral-700">已選 {selected.size} 項</span>
          <button
            onClick={restoreSelected}
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-100"
          >
            復原選取的
          </button>
          <button
            onClick={deleteSelectedForever}
            className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          >
            永久刪除選取的
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-neutral-400 hover:text-neutral-700">
            取消選取
          </button>
        </div>
      )}

      {totalArchived === 0 && <p className="text-sm text-neutral-400">目前沒有封存的項目。</p>}
      {totalArchived > 0 && current.items.length === 0 && (
        <p className="text-sm text-neutral-400">這個分類目前沒有封存的項目。</p>
      )}

      {current.items.length > 0 && (
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {current.items.map((item) => (
            <ArchiveRow
              key={item.id}
              title={item.title}
              checked={selected.has(item.id)}
              onToggle={() => toggle(item.id)}
              onRestore={() => current.restore(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveRow({
  title,
  checked,
  onToggle,
  onRestore,
}: {
  title: string;
  checked: boolean;
  onToggle: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <button type="button" role="checkbox" aria-checked={checked} onClick={onToggle}>
        <CheckboxIcon checked={checked} />
      </button>
      <span className="min-w-0 flex-1 truncate text-neutral-700">{title}</span>
      <button onClick={onRestore} className="shrink-0 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline">
        復原
      </button>
    </div>
  );
}
