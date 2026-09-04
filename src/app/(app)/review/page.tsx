"use client";

import { useState } from "react";
import { useReviewTasks, useUpdateTask } from "@/hooks/use-tasks";
import { useTaskPanelStore } from "@/stores/task-panel";
import type { TaskWithAssignee } from "@/hooks/use-tasks";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReviewPage() {
  const { data: tasks, isLoading } = useReviewTasks();
  const openTask = useTaskPanelStore((s) => s.open);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Review</h1>
        <p className="mt-1 text-sm text-neutral-500">Follow-up 時間到了，需要你確認進度的事情。</p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">載入中…</p>}
      {!isLoading && tasks?.length === 0 && <p className="text-sm text-neutral-400">目前沒有要確認的事項。</p>}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {tasks?.map((t) => (
          <ReviewRow key={t.id} task={t} onOpen={() => openTask(t.id)} />
        ))}
      </div>
    </div>
  );
}

function ReviewRow({ task, onOpen }: { task: TaskWithAssignee; onOpen: () => void }) {
  const updateTask = useUpdateTask();
  const [postponing, setPostponing] = useState(false);

  function markDoneContinue() {
    updateTask.mutate({ id: task.id, patch: { status: "todo" } });
  }
  function markDoneClose() {
    updateTask.mutate({ id: task.id, patch: { status: "completed", completed_at: new Date().toISOString() } });
  }
  function cancelDelegation() {
    updateTask.mutate({
      id: task.id,
      patch: { assignee_id: null, delegate_date: null, delegate_deadline: null, follow_up_at: null, status: "todo" },
    });
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 py-3">
      <button onClick={onOpen} className="flex items-center justify-between text-left hover:underline">
        <span className="text-sm font-medium text-neutral-900">{task.title}</span>
        <span className="text-xs font-medium text-neutral-500">{task.people?.name ?? "未指定"}</span>
      </button>
      <div className="flex gap-4 text-xs text-neutral-400">
        <span>期限：{fmt(task.delegate_deadline)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button onClick={markDoneContinue} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">
          ✓ 對方完成・我繼續處理
        </button>
        <button onClick={markDoneClose} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">
          ✓ 對方完成・結案
        </button>
        <button
          onClick={() => setPostponing((v) => !v)}
          className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50"
        >
          延後追蹤
        </button>
        <button onClick={cancelDelegation} className="rounded border border-neutral-300 px-2 py-1 text-red-500 hover:bg-red-50">
          取消交辦
        </button>

        {postponing && (
          <input
            type="datetime-local"
            autoFocus
            onChange={(e) => {
              if (e.target.value) {
                // 對方 Deadline 跟我的 Follow-up 是同一個時間，延後要兩個欄位
                // 一起改（見 AssigneeSection 的說明）。
                const iso = new Date(e.target.value).toISOString();
                updateTask.mutate({ id: task.id, patch: { delegate_deadline: iso, follow_up_at: iso } });
                setPostponing(false);
              }
            }}
            className="rounded border border-neutral-300 px-1.5 py-0.5"
          />
        )}
      </div>
    </div>
  );
}
