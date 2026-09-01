"use client";

import { useActiveTimer, useStopTimer } from "@/hooks/use-timer";
import { formatElapsed, useElapsedSeconds } from "@/hooks/use-elapsed";
import { useTaskPanelStore } from "@/stores/task-panel";

export function ActiveTimerBadge() {
  const { data: timer } = useActiveTimer();
  const stopTimer = useStopTimer();
  const openTask = useTaskPanelStore((s) => s.open);
  const elapsed = useElapsedSeconds(timer?.started_at);

  if (!timer || !timer.task_id) return null;

  return (
    <button
      onClick={() => openTask(timer.task_id!)}
      className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600"
    >
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
      <span className="max-w-32 truncate">{timer.tasks?.title ?? "計時中"}</span>
      <span className="font-mono">{formatElapsed(elapsed)}</span>
      <span
        role="button"
        onClick={(e) => {
          e.stopPropagation();
          stopTimer.mutate();
        }}
        className="rounded-full px-1.5 hover:bg-red-100"
      >
        停止
      </span>
    </button>
  );
}
