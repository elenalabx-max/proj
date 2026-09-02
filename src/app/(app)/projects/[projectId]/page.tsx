"use client";

import { use, useState } from "react";
import { useProject } from "@/hooks/use-projects";
import { useCreateTask, useProjectTasks } from "@/hooks/use-tasks";
import { useTaskPanelStore } from "@/stores/task-panel";
import { ProjectStatsPanel } from "@/components/projects/project-stats-panel";
import { ProjectTaskBoard } from "@/components/projects/project-task-board";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { getContrastTextColor } from "@/lib/colors";
import { TASK_STATUS_LABEL, projectStatusLabel, type Project, type Task } from "@/lib/types";

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

  // 用 project.id 當 key，切換不同 Project 時整個重新掛載。
  return <ProjectPageBody key={project.id} project={project} tasks={tasks ?? []} />;
}

function ProjectPageBody({ project, tasks }: { project: Project; tasks: Task[] }) {
  const createTask = useCreateTask();
  const openTask = useTaskPanelStore((s) => s.open);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editOpen, setEditOpen] = useState(false);

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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: project.color }} />
            <h1 className="text-xl font-semibold text-neutral-900">{project.name}</h1>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            編輯
          </button>
        </div>

        <div className="mt-4 space-y-2.5 text-sm">
          <PropertyRow label="狀態">
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
              {projectStatusLabel(project)}
            </span>
          </PropertyRow>

          <PropertyRow label="類別">
            <span className={project.category ? "text-neutral-700" : "text-neutral-300"}>
              {project.category || "Empty"}
            </span>
          </PropertyRow>

          <PropertyRow label="業主">
            <span className={project.owner ? "text-neutral-700" : "text-neutral-300"}>{project.owner || "Empty"}</span>
          </PropertyRow>

          <PropertyRow label="執行期間">
            <span className={project.start_date || project.due_date ? "text-neutral-700" : "text-neutral-300"}>
              {project.start_date || project.due_date
                ? `${project.start_date ?? "?"} – ${project.due_date ?? "?"}`
                : "Empty"}
            </span>
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

      {editOpen && <ProjectFormDialog project={project} onClose={() => setEditOpen(false)} />}
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
