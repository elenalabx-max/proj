"use client";

import { use, useState } from "react";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { useCreateTask, useProjectTasks } from "@/hooks/use-tasks";
import { useTaskPanelStore } from "@/stores/task-panel";
import { ColorPicker } from "@/components/ui/color-picker";
import { getContrastTextColor } from "@/lib/colors";
import { PROJECT_STATUS_LABEL, TASK_STATUS_LABEL, type ProjectStatus } from "@/lib/types";

const STATUS_OPTIONS = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[];

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const openTask = useTaskPanelStore((s) => s.open);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [colorOpen, setColorOpen] = useState(false);

  if (isLoading || !project) {
    return <p className="text-sm text-neutral-500">載入中…</p>;
  }

  const completed = tasks?.filter((t) => t.status === "completed").length ?? 0;
  const total = tasks?.length ?? 0;

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title || !project) return;
    createTask.mutate({ title, project_id: project.id, area_id: project.area_id });
    setNewTaskTitle("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setColorOpen((v) => !v)}
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ background: project.color }}
            aria-label="更改顏色"
          />
          <h1 className="text-xl font-semibold text-neutral-900">{project.name}</h1>
        </div>
        {colorOpen && (
          <div className="mt-2">
            <ColorPicker
              value={project.color}
              onChange={(color) => updateProject.mutate({ id: project.id, patch: { color } })}
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-sm">
          <select
            value={project.status}
            onChange={(e) =>
              updateProject.mutate({
                id: project.id,
                patch: { status: e.target.value as ProjectStatus },
              })
            }
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <span className="text-neutral-500">
            {completed}/{total} 完成
          </span>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-900">Tasks</h2>

        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {tasks?.length === 0 && (
            <p className="px-4 py-3 text-sm text-neutral-400">還沒有 Task。</p>
          )}
          {tasks?.map((t) => (
            <button
              key={t.id}
              onClick={() => openTask(t.id)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
            >
              <span className={t.status === "completed" ? "text-neutral-400 line-through" : "text-neutral-900"}>
                {t.title}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{ background: project.color, color: getContrastTextColor(project.color) }}
              >
                {TASK_STATUS_LABEL[t.status]}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleAddTask}>
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="+ 新增 Task…按 Enter"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:bg-white"
          />
        </form>
      </section>
    </div>
  );
}
