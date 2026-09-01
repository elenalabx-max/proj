"use client";

import { useWaitingTasks } from "@/hooks/use-tasks";
import { useTaskPanelStore } from "@/stores/task-panel";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function WaitingPage() {
  const { data: tasks, isLoading } = useWaitingTasks();
  const openTask = useTaskPanelStore((s) => s.open);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Waiting</h1>
        <p className="mt-1 text-sm text-neutral-500">已經交辦但現在不用我處理的事情。</p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">載入中…</p>}
      {!isLoading && tasks?.length === 0 && <p className="text-sm text-neutral-400">目前沒有交辦中的事項。</p>}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {tasks?.map((t) => (
          <button
            key={t.id}
            onClick={() => openTask(t.id)}
            className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-900">{t.title}</span>
              <span className="text-xs font-medium text-neutral-500">{t.people?.name ?? "未指定"}</span>
            </div>
            <div className="flex gap-4 text-xs text-neutral-400">
              <span>Deadline：{fmt(t.delegate_deadline)}</span>
              <span>Follow-up：{fmt(t.follow_up_at)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
