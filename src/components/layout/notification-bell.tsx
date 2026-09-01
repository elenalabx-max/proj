"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDueReminders, useToggleReminderDone } from "@/hooks/use-reminders";
import { useReviewTasks } from "@/hooks/use-tasks";
import { useTaskPanelStore } from "@/stores/task-panel";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: reminders } = useDueReminders();
  const { data: reviewTasks } = useReviewTasks();
  const toggleDone = useToggleReminderDone();
  const openTask = useTaskPanelStore((s) => s.open);
  const router = useRouter();

  const count = (reminders?.length ?? 0) + (reviewTasks?.length ?? 0);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
        title="通知"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2.5a3.2 3.2 0 0 0-3.2 3.2c0 3.7-1.5 4.8-1.5 4.8h9.4s-1.5-1.1-1.5-4.8A3.2 3.2 0 0 0 8 2.5Z" />
          <path d="M6.6 12.7a1.4 1.4 0 0 0 2.8 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-neutral-200 bg-white p-2 text-sm shadow-lg">
            {count === 0 && <p className="px-2 py-3 text-xs text-neutral-400">沒有需要注意的事情。</p>}

            {!!reminders?.length && (
              <div className="mb-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">提醒</div>
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-neutral-50">
                    <button
                      onClick={() => {
                        if (r.linked_type === "task" && r.linked_id) openTask(r.linked_id);
                        setOpen(false);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-neutral-900">{r.title ?? r.note ?? "提醒"}</div>
                      <div className="font-mono text-[11px] text-neutral-400">{fmtTime(r.remind_at)}</div>
                    </button>
                    <button
                      onClick={() => toggleDone.mutate({ id: r.id, done: true })}
                      className="ml-2 shrink-0 text-xs text-neutral-400 hover:text-neutral-800"
                    >
                      完成
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!!reviewTasks?.length && (
              <div>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">待確認</div>
                {reviewTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      router.push("/review");
                      setOpen(false);
                    }}
                    className="block w-full truncate rounded-md px-2 py-1.5 text-left text-neutral-900 hover:bg-neutral-50"
                  >
                    {t.title}
                    <span className="ml-1.5 text-xs text-neutral-400">{t.people?.name ?? "未指定"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
