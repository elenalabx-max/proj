"use client";

import { useState } from "react";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useTask, useUpdateTask, useArchiveTask } from "@/hooks/use-tasks";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { TASK_STATUS_LABEL, type Area, type Project, type Task, type TaskStatus } from "@/lib/types";

const STATUS_OPTIONS = Object.keys(TASK_STATUS_LABEL) as TaskStatus[];

export function TaskDetailPanel() {
  const taskId = useTaskPanelStore((s) => s.taskId);
  const close = useTaskPanelStore((s) => s.close);

  const { data: task } = useTask(taskId);
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();

  if (!taskId || !task) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/10" onClick={close} />
      {/* keyed by task.id so switching tasks resets the buffered title/description
          fields without needing an effect-driven setState (see react-hooks/set-state-in-effect) */}
      <TaskPanelBody key={task.id} task={task} areas={areas ?? []} projects={projects ?? []} close={close} />
    </div>
  );
}

function TaskPanelBody({
  task,
  areas,
  projects,
  close,
}: {
  task: Task;
  areas: Area[];
  projects: Project[];
  close: () => void;
}) {
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  const areaOfProject = (projectId: string | null) =>
    projects.find((p) => p.id === projectId)?.area_id ?? null;

  const projectOptions = projects.filter((p) => !task.area_id || p.area_id === task.area_id);

  return (
    <div className="flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Task</span>
        <button onClick={close} className="text-sm text-neutral-400 hover:text-neutral-700">
          關閉
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== task.title && updateTask.mutate({ id: task.id, patch: { title } })}
        className="mb-4 w-full border-b border-transparent text-lg font-semibold outline-none focus:border-neutral-300"
      />

      <div className="space-y-4 text-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Area</label>
          <select
            value={task.area_id ?? ""}
            onChange={(e) =>
              updateTask.mutate({
                id: task.id,
                patch: { area_id: e.target.value || null, project_id: null },
              })
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
          <label className="mb-1 block text-xs font-medium text-neutral-500">Project</label>
          <select
            value={task.project_id ?? ""}
            onChange={(e) => {
              const project_id = e.target.value || null;
              updateTask.mutate({
                id: task.id,
                patch: { project_id, area_id: project_id ? areaOfProject(project_id) : task.area_id },
              });
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
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            value={task.status}
            onChange={(e) => updateTask.mutate({ id: task.id, patch: { status: e.target.value as TaskStatus } })}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={task.important}
              onChange={(e) => updateTask.mutate({ id: task.id, patch: { important: e.target.checked } })}
            />
            重要
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={task.urgent}
              onChange={(e) => updateTask.mutate({ id: task.id, patch: { urgent: e.target.checked } })}
            />
            緊急
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Due Date</label>
          <input
            type="date"
            value={task.due_date ?? ""}
            onChange={(e) => updateTask.mutate({ id: task.id, patch: { due_date: e.target.value || null } })}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              description !== (task.description ?? "") &&
              updateTask.mutate({ id: task.id, patch: { description: description || null } })
            }
            rows={4}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </div>

        <button
          onClick={() => {
            archiveTask.mutate(task.id);
            close();
          }}
          className="text-xs font-medium text-red-500 hover:underline"
        >
          封存這個 Task
        </button>
      </div>
    </div>
  );
}
