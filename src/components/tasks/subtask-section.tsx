"use client";

import { useState } from "react";
import {
  useConvertSubtaskToTask,
  useCreateSubtask,
  useDeleteSubtask,
  useSubtasks,
  useUpdateSubtask,
} from "@/hooks/use-subtasks";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task } from "@/lib/types";

export function SubtaskSection({ task }: { task: Task }) {
  const { data: subtasks } = useSubtasks(task.id);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const convertSubtask = useConvertSubtaskToTask();
  const [title, setTitle] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    createSubtask.mutate({ taskId: task.id, title: t });
    setTitle("");
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">Subtasks</label>
      <div className="space-y-1">
        {subtasks?.map((s) => (
          <div key={s.id} className="group flex items-center gap-2">
            <Checkbox
              checked={!!s.completed_at}
              onChange={() =>
                updateSubtask.mutate({
                  id: s.id,
                  taskId: task.id,
                  patch: { completed_at: s.completed_at ? null : new Date().toISOString() },
                })
              }
            />
            <span className={`flex-1 truncate text-sm ${s.completed_at ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
              {s.title}
            </span>
            <button
              onClick={() => convertSubtask.mutate({ subtask: s, parentTask: task })}
              className="hidden shrink-0 text-[10px] text-neutral-400 hover:text-neutral-700 group-hover:inline"
              title="轉成獨立 Task"
            >
              轉 Task
            </button>
            <button
              onClick={() => deleteSubtask.mutate({ id: s.id, taskId: task.id })}
              className="hidden shrink-0 text-neutral-300 hover:text-red-500 group-hover:inline"
              title="刪除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="mt-1.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="+ 新增 Subtask…"
          className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs outline-none focus:border-neutral-400 focus:bg-white"
        />
      </form>
    </div>
  );
}
