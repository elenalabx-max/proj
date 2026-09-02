"use client";

import { use, useState } from "react";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { useCreateTask, useProjectTasks } from "@/hooks/use-tasks";
import { useTaskPanelStore } from "@/stores/task-panel";
import { ColorPicker } from "@/components/ui/color-picker";
import { ProjectStatsPanel } from "@/components/projects/project-stats-panel";
import { ProjectTaskBoard } from "@/components/projects/project-task-board";
import { getContrastTextColor } from "@/lib/colors";
import { PROJECT_STATUS_LABEL, TASK_STATUS_LABEL, type Project, type ProjectStatus, type Task } from "@/lib/types";

const STATUS_OPTIONS = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[];

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading } = useProject(projectId);
  const { data: tasks } = useProjectTasks(projectId);

  if (isLoading || !project) {
    return <p className="text-sm text-neutral-500">載入中…</p>;
  }

  // 用 project.id 當 key，切換不同 Project 時整個重新掛載，
  // 避免類別/業主這種緩衝中的輸入框留著上一個 Project 的內容。
  return <ProjectPageBody key={project.id} project={project} tasks={tasks ?? []} />;
}

function ProjectPageBody({ project, tasks }: { project: Project; tasks: Task[] }) {
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const openTask = useTaskPanelStore((s) => s.open);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [colorOpen, setColorOpen] = useState(false);
  const [category, setCategory] = useState(project.category ?? "");
  const [owner, setOwner] = useState(project.owner ?? "");

  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
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

        <div className="mt-4 space-y-2.5 text-sm">
          <PropertyRow label="狀態">
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
          </PropertyRow>

          <PropertyRow label="類別">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onBlur={() => category !== (project.category ?? "") && updateProject.mutate({ id: project.id, patch: { category: category || null } })}
              placeholder="Empty"
              className="w-full rounded-md border border-transparent px-1.5 py-1 text-xs outline-none hover:border-neutral-200 focus:border-neutral-300"
            />
          </PropertyRow>

          <PropertyRow label="業主">
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              onBlur={() => owner !== (project.owner ?? "") && updateProject.mutate({ id: project.id, patch: { owner: owner || null } })}
              placeholder="Empty"
              className="w-full rounded-md border border-transparent px-1.5 py-1 text-xs outline-none hover:border-neutral-200 focus:border-neutral-300"
            />
          </PropertyRow>

          <PropertyRow label="執行期間">
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={project.start_date ?? ""}
                onChange={(e) => updateProject.mutate({ id: project.id, patch: { start_date: e.target.value || null } })}
                className="rounded-md border border-neutral-300 px-1.5 py-1 text-xs"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="date"
                value={project.due_date ?? ""}
                onChange={(e) => updateProject.mutate({ id: project.id, patch: { due_date: e.target.value || null } })}
                className="rounded-md border border-neutral-300 px-1.5 py-1 text-xs"
              />
            </div>
          </PropertyRow>

          <PropertyRow label="完成度">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-neutral-500">
                {pct}%（{completed}/{total}）
              </span>
            </div>
          </PropertyRow>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-900">Tasks</h2>

        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
          {tasks.length === 0 && <p className="px-4 py-3 text-sm text-neutral-400">還沒有 Task。</p>}
          {tasks.map((t) => (
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

      <ProjectStatsPanel projectId={project.id} />
      <ProjectTaskBoard tasks={tasks} />
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-neutral-400">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
