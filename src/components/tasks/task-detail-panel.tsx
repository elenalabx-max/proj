"use client";

import { useState } from "react";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useTask, useUpdateTask, useArchiveTask } from "@/hooks/use-tasks";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { TASK_STATUS_LABEL, type Area, type Project, type Task, type TaskStatus } from "@/lib/types";
import { minutesToTime, timeToMinutes } from "@/lib/date";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/time-picker";
import { AssigneeSection } from "./assignee-section";
import { TimeLogSection } from "./time-log-section";
import { SubtaskSection } from "./subtask-section";
import { RepeatSection } from "./repeat-section";

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              archiveTask.mutate(task.id);
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
          <Checkbox
            checked={task.important}
            onChange={() => updateTask.mutate({ id: task.id, patch: { important: !task.important } })}
            label="重要"
          />
          <Checkbox
            checked={task.urgent}
            onChange={() => updateTask.mutate({ id: task.id, patch: { urgent: !task.urgent } })}
            label="緊急"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">Due Date</label>
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => updateTask.mutate({ id: task.id, patch: { due_date: e.target.value || null } })}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-neutral-500">預計(分)</label>
            <input
              type="number"
              min={0}
              value={task.estimated_minutes ?? ""}
              onChange={(e) =>
                updateTask.mutate({
                  id: task.id,
                  patch: { estimated_minutes: e.target.value ? Number(e.target.value) : null },
                })
              }
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            />
          </div>
        </div>

        <TimeLogSection task={task} />

        <div className="space-y-2 rounded-md border border-neutral-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">排定時間（Calendar 上顯示的時間）</span>
            <Checkbox
              checked={task.is_all_day}
              onChange={() =>
                updateTask.mutate({
                  id: task.id,
                  patch: !task.is_all_day
                    ? { is_all_day: true, scheduled_start: null, scheduled_end: null }
                    : { is_all_day: false },
                })
              }
              className="text-xs"
              label="全天"
            />
          </div>

          <input
            type="date"
            value={task.scheduled_date ?? ""}
            onChange={(e) => updateTask.mutate({ id: task.id, patch: { scheduled_date: e.target.value || null } })}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />

          {!task.is_all_day && (
            <div className="flex items-center gap-2">
              <TimePicker
                value={task.scheduled_start}
                onChange={(start) => {
                  // 改開始時間要維持原本的時長：原本 13:00–14:00 改成 14:00 開始，
                  // 結束時間要跟著位移成 15:00，不能卡在原本的絕對結束時間；
                  // 還沒排過時間的話才用預設 1 小時。
                  const durationMin =
                    task.scheduled_start && task.scheduled_end
                      ? timeToMinutes(task.scheduled_end) - timeToMinutes(task.scheduled_start)
                      : 60;
                  const end = minutesToTime(timeToMinutes(start) + durationMin);
                  updateTask.mutate({
                    id: task.id,
                    patch: { scheduled_start: start, scheduled_end: end, estimated_minutes: durationMin },
                  });
                }}
                className="flex-1"
              />
              <span className="text-neutral-400">–</span>
              <TimePicker
                value={task.scheduled_end}
                onChange={(end) =>
                  updateTask.mutate({
                    id: task.id,
                    // 排定時間改了，預計工時自動跟著算，不用另外手動填。
                    patch: task.scheduled_start
                      ? { scheduled_end: end, estimated_minutes: timeToMinutes(end) - timeToMinutes(task.scheduled_start) }
                      : { scheduled_end: end },
                  })
                }
                className="flex-1"
              />
            </div>
          )}
          {!task.scheduled_date && (
            <p className="text-[11px] text-neutral-400">先選日期，才會出現在 Calendar 上。</p>
          )}
        </div>

        <AssigneeSection task={task} />
        <SubtaskSection task={task} />
        <RepeatSection task={task} />

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
      </div>
    </div>
  );
}
