"use client";

import { TASK_STATUS_LABEL, type Task, type TaskStatus } from "@/lib/types";
import { useTaskPanelStore } from "@/stores/task-panel";

const BOARD_STATUSES: TaskStatus[] = ["inbox", "todo", "in_progress", "waiting", "review", "completed", "forgotten"];

// 純顯示的看板——不能拖曳換狀態，狀態要改一律進 Task 詳細面板改，
// 這裡只是換個角度看同一批 Task（跟上面清單、下面統計是同一份資料）。
export function ProjectTaskBoard({ tasks }: { tasks: Task[] }) {
  const openTask = useTaskPanelStore((s) => s.open);

  if (tasks.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-neutral-900">Board</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {BOARD_STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="w-44 shrink-0 space-y-1.5">
              <div className="flex items-center gap-1.5 px-0.5 text-xs font-semibold text-neutral-500">
                {TASK_STATUS_LABEL[status]}
                <span className="text-neutral-300">{columnTasks.length}</span>
              </div>
              <div className="min-h-[44px] space-y-1.5 rounded-lg bg-neutral-50 p-1.5">
                {columnTasks.length === 0 && <p className="px-1.5 py-1 text-[11px] text-neutral-300">—</p>}
                {columnTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTask(t.id)}
                    className="block w-full truncate rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-left text-xs font-medium text-neutral-900 shadow-sm hover:border-neutral-300"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
