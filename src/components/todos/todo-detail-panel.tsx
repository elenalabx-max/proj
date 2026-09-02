"use client";

import { useState } from "react";
import { useTodoPanelStore } from "@/stores/todo-panel";
import { useTodo, useUpdateTodo, useCompleteTodo, useConvertTodoToTask, useArchiveTodo } from "@/hooks/use-todos";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { Checkbox } from "@/components/ui/checkbox";
import { RepeatSection } from "./repeat-section";
import type { Area, Project, Todo } from "@/lib/types";

const FOREVER = "9999-12-31";

export function TodoDetailPanel() {
  const todoId = useTodoPanelStore((s) => s.todoId);
  const close = useTodoPanelStore((s) => s.close);
  const { data: todo } = useTodo(todoId);
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();

  if (!todoId || !todo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={close}>
      {/* keyed by todo.id so the buffered title field resets per todo without an effect */}
      <TodoPanelBody key={todo.id} todo={todo} areas={areas ?? []} projects={projects ?? []} close={close} />
    </div>
  );
}

function TodoPanelBody({
  todo,
  areas,
  projects,
  close,
}: {
  todo: Todo;
  areas: Area[];
  projects: Project[];
  close: () => void;
}) {
  const updateTodo = useUpdateTodo();
  const completeTodo = useCompleteTodo();
  const convertTodo = useConvertTodoToTask();
  const archiveTodo = useArchiveTodo();
  const openTask = useTaskPanelStore((s) => s.open);

  const [title, setTitle] = useState(todo.title);

  const projectOptions = projects.filter((p) => !todo.area_id || p.area_id === todo.area_id);
  const isForgotten = !!todo.forgotten_until;

  async function handleUpgrade() {
    const task = await convertTodo.mutateAsync({ todo });
    close();
    openTask(task.id);
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Todo</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              archiveTodo.mutate(todo.id);
              close();
            }}
            title="會封存而不是永久刪除，可從 Settings → 封存 復原"
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4 4.5 4.6 13a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.5" />
            </svg>
            刪除
          </button>
          <button onClick={close} className="text-sm text-neutral-400 hover:text-neutral-700">
            關閉
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== todo.title && updateTodo.mutate({ id: todo.id, patch: { title } })}
        className="w-full border-b border-transparent text-base font-semibold outline-none focus:border-neutral-300"
      />

      <div className="space-y-3 text-sm">
        <Checkbox
          checked={!!todo.completed_at}
          onChange={() => completeTodo.mutate({ id: todo.id, completed: !todo.completed_at })}
          label="完成"
        />

        <div className="flex gap-4">
          <Checkbox
            checked={todo.important}
            onChange={() => updateTodo.mutate({ id: todo.id, patch: { important: !todo.important } })}
            label="重要"
          />
          <Checkbox
            checked={todo.urgent}
            onChange={() => updateTodo.mutate({ id: todo.id, patch: { urgent: !todo.urgent } })}
            label="緊急"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Area</label>
          <select
            value={todo.area_id ?? ""}
            onChange={(e) =>
              updateTodo.mutate({ id: todo.id, patch: { area_id: e.target.value || null, project_id: null } })
            }
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            <option value="">未分類</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.type === "personal" ? "個人" : "工作"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Project（小雜事也可以掛，不會因此變成 Task）</label>
          <select
            value={todo.project_id ?? ""}
            onChange={(e) => {
              const project_id = e.target.value || null;
              const area_id = project_id ? projects.find((p) => p.id === project_id)?.area_id ?? todo.area_id : todo.area_id;
              updateTodo.mutate({ id: todo.id, patch: { project_id, area_id } });
            }}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            <option value="">無</option>
            {projectOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">日期</label>
          <input
            type="date"
            value={todo.date ?? ""}
            onChange={(e) => updateTodo.mutate({ id: todo.id, patch: { date: e.target.value || null } })}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </div>

        <RepeatSection todo={todo} />

        {isForgotten && (
          <div className="rounded-md bg-neutral-50 px-2.5 py-2 text-xs text-neutral-500">
            遺忘中（{todo.forgotten_until! >= FOREVER ? "無限期" : `到 ${todo.forgotten_until}`}）
            <button
              onClick={() => updateTodo.mutate({ id: todo.id, patch: { forgotten_until: null } })}
              className="ml-2 font-medium text-neutral-700 hover:underline"
            >
              取消遺忘
            </button>
          </div>
        )}

        <button
          onClick={handleUpgrade}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          升級為 Task（需要排程／記工時再用這個）
        </button>
      </div>
    </div>
  );
}
