"use client";

import { useState } from "react";
import { useCreateReminder, useDeleteReminder, useReminders, useToggleReminderDone } from "@/hooks/use-reminders";
import type { Task } from "@/lib/types";

export function ReminderSection({ task }: { task: Task }) {
  const { data: reminders } = useReminders("task", task.id);
  const createReminder = useCreateReminder();
  const toggleDone = useToggleReminderDone();
  const deleteReminder = useDeleteReminder();
  const [remindAt, setRemindAt] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!remindAt) return;
    createReminder.mutate({ linkedType: "task", linkedId: task.id, remindAt: new Date(remindAt).toISOString() });
    setRemindAt("");
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-500">Reminder</label>
      <div className="space-y-1">
        {reminders?.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-md border border-neutral-200 px-2 py-1 text-xs"
          >
            <span className={r.completed_at ? "text-neutral-400 line-through" : "text-neutral-900"}>
              {new Date(r.remind_at).toLocaleString("zh-TW", {
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={() =>
                  toggleDone.mutate({ id: r.id, done: !r.completed_at, linkedType: "task", linkedId: task.id })
                }
                className="text-neutral-400 hover:text-neutral-700"
              >
                {r.completed_at ? "取消完成" : "完成"}
              </button>
              <button
                onClick={() => deleteReminder.mutate({ id: r.id, linkedType: "task", linkedId: task.id })}
                className="text-neutral-300 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="mt-1.5 flex gap-1.5">
        <input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
        />
        <button type="submit" className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">
          加
        </button>
      </form>
    </div>
  );
}
