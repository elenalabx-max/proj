"use client";

import { useState } from "react";
import {
  useCreateTimeLog,
  useDeleteTimeLog,
  useTaskActualMinutes,
  useTimeLogsForTask,
  useUpdateTimeLog,
  type TimeLog,
} from "@/hooks/use-time-logs";
import { useActiveTimer, useStartTimer, useStopTimer } from "@/hooks/use-timer";
import { formatElapsed, formatMinutes, useElapsedSeconds } from "@/hooks/use-elapsed";
import { todayISODate } from "@/lib/date";
import type { Task } from "@/lib/types";

export function TimeLogSection({ task }: { task: Task }) {
  const { data: logs } = useTimeLogsForTask(task.id);
  const { data: actualMinutes } = useTaskActualMinutes(task.id);
  const { data: activeTimer } = useActiveTimer();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  const isRunningHere = activeTimer?.task_id === task.id;
  const elapsedSeconds = useElapsedSeconds(isRunningHere ? activeTimer!.started_at : null);

  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);

  return (
    <div className="space-y-2 rounded-md border border-neutral-200 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-neutral-500">工時</span>
        <span className="text-neutral-500">
          預計 {task.estimated_minutes != null ? formatMinutes(task.estimated_minutes) : "—"} ・ 實際{" "}
          <span className="font-semibold text-neutral-900">{formatMinutes(actualMinutes ?? 0)}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isRunningHere ? (
          <button
            onClick={() => stopTimer.mutate()}
            className="flex-1 rounded-md bg-red-500 px-2 py-1.5 text-xs font-medium text-white"
          >
            ■ 停止（{formatElapsed(elapsedSeconds)}）
          </button>
        ) : (
          <button
            onClick={() => startTimer.mutate(task.id)}
            className="flex-1 rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white"
          >
            ▶ 開始工作
          </button>
        )}
      </div>

      <div className="space-y-1">
        {logs?.map((log) => (
          <div key={log.id} className="group flex items-center justify-between rounded-md border border-neutral-100 px-2 py-1 text-xs">
            <span className="text-neutral-700">
              {log.log_date}
              {log.started_at && log.ended_at && (
                <span className="ml-1 font-mono text-neutral-400">
                  {new Date(log.started_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}–
                  {new Date(log.ended_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <span className="ml-1.5 font-semibold text-neutral-900">{formatMinutes(log.duration_minutes)}</span>
              {log.note && <span className="ml-1.5 text-neutral-400">· {log.note}</span>}
            </span>
            <span className="hidden items-center gap-2 group-hover:flex">
              <button
                onClick={() => {
                  setEditingLog(log);
                  setShowForm(true);
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                編輯
              </button>
              <DeleteLogButton log={log} taskId={task.id} />
            </span>
          </div>
        ))}
      </div>

      {showForm ? (
        <TimeLogForm
          task={task}
          editingLog={editingLog}
          onDone={() => {
            setShowForm(false);
            setEditingLog(null);
          }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          + 手動新增工時
        </button>
      )}
    </div>
  );
}

function DeleteLogButton({ log, taskId }: { log: TimeLog; taskId: string }) {
  const deleteTimeLog = useDeleteTimeLog();
  return (
    <button onClick={() => deleteTimeLog.mutate({ id: log.id, taskId })} className="text-neutral-300 hover:text-red-500">
      ✕
    </button>
  );
}

function TimeLogForm({
  task,
  editingLog,
  onDone,
}: {
  task: Task;
  editingLog: TimeLog | null;
  onDone: () => void;
}) {
  const taskId = task.id;
  const createTimeLog = useCreateTimeLog();
  const updateTimeLog = useUpdateTimeLog();

  // 新增時（不是編輯既有紀錄）先用這個 Task 原本排定的時間/預計工時當預設值，
  // 不要每次都寫死 09:00–10:00・30 分鐘——實際工作通常跟排定的差不多，
  // 這樣大部分時候直接按新增就好，真的不一樣再自己改。
  const [method, setMethod] = useState<"range" | "duration">(editingLog?.started_at ? "range" : "duration");
  const [logDate, setLogDate] = useState(editingLog?.log_date ?? task.scheduled_date ?? todayISODate());
  const [startTime, setStartTime] = useState(editingLog?.started_at?.slice(11, 16) ?? task.scheduled_start?.slice(0, 5) ?? "09:00");
  const [endTime, setEndTime] = useState(editingLog?.ended_at?.slice(11, 16) ?? task.scheduled_end?.slice(0, 5) ?? "10:00");
  const [durationInput, setDurationInput] = useState(
    String(editingLog?.duration_minutes ?? task.estimated_minutes ?? 30),
  );
  const [note, setNote] = useState(editingLog?.note ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let duration_minutes: number;
    let started_at: string | null = null;
    let ended_at: string | null = null;

    if (method === "range") {
      const start = new Date(`${logDate}T${startTime}`);
      const end = new Date(`${logDate}T${endTime}`);
      duration_minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      started_at = start.toISOString();
      ended_at = end.toISOString();
    } else {
      duration_minutes = Math.max(1, Number(durationInput) || 0);
    }

    if (editingLog) {
      updateTimeLog.mutate({
        id: editingLog.id,
        taskId,
        patch: { log_date: logDate, started_at, ended_at, duration_minutes, note: note || null },
      });
    } else {
      createTimeLog.mutate({
        task_id: taskId,
        log_date: logDate,
        started_at,
        ended_at,
        duration_minutes,
        note: note || null,
        source: "manual",
      });
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5 rounded-md bg-neutral-50 p-2">
      <div className="flex gap-1">
        {(["range", "duration"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`rounded px-2 py-0.5 text-[11px] ${method === m ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-600"}`}
          >
            {m === "range" ? "起訖時間" : "直接輸入時長"}
          </button>
        ))}
      </div>

      <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="w-full rounded border border-neutral-300 px-2 py-1 text-xs" />

      {method === "range" ? (
        // 兩個原生 time 選單並排在手機真機上一樣會被擠爆（跟 date 選單同一個
        // 瀏覽器限制），窄螢幕改上下疊放。
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full min-w-0 rounded border border-neutral-300 px-2 py-1 text-xs" />
          <span className="hidden text-neutral-400 sm:inline">–</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full min-w-0 rounded border border-neutral-300 px-2 py-1 text-xs" />
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
          />
          <span className="text-xs text-neutral-400">分鐘</span>
        </div>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="備註（選填）"
        className="w-full rounded border border-neutral-300 px-2 py-1 text-xs"
      />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="text-xs text-neutral-400">
          取消
        </button>
        <button type="submit" className="rounded bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white">
          {editingLog ? "儲存" : "新增"}
        </button>
      </div>
    </form>
  );
}
