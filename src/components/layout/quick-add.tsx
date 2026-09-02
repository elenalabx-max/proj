"use client";

import { useState } from "react";
import { useCreateTodo } from "@/hooks/use-todos";
import { useCreateReminder } from "@/hooks/use-reminders";
import { useCreateTask } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { TimePicker } from "@/components/ui/time-picker";

type Mode = "todo" | "task" | "reminder";

// 全站快速新增：只要標題，Enter 就送進 Inbox（見規劃書第 38 節）。
// 預設建立 Todo；Task／提醒模式標題送出後多一步選日期（可選加 Project）才真的
// 建立——提醒一定要有時間，Task 沒選日期就留在 Inbox（status='inbox'），
// 選了日期就直接算排定好的（status='todo'）。有掛 Project 才會畫在 Calendar
// 上（沒掛就不知道要畫在 Work 還 Personal 欄），Task 額外會把 Project 的
// Area 也帶上，跟 Task Detail Panel 手動選 Project 的行為一致。
export function QuickAdd() {
  const [mode, setMode] = useState<Mode>("todo");
  const [value, setValue] = useState("");
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [taskDate, setTaskDate] = useState("");
  const [remindDate, setRemindDate] = useState("");
  const [remindTime, setRemindTime] = useState("");
  const [projectId, setProjectId] = useState("");
  const createTodo = useCreateTodo();
  const createTask = useCreateTask();
  const createReminder = useCreateReminder();
  const { data: projects } = useProjects();

  function resetPending() {
    setPendingTitle(null);
    setValue("");
    setTaskDate("");
    setRemindDate("");
    setRemindTime("");
    setProjectId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;

    if (mode === "todo") {
      createTodo.mutate(title);
      setValue("");
    } else {
      setPendingTitle(title); // 等使用者選日期／時間（可選 Project）才真的建立
    }
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingTitle) return;
    const project = projects?.find((p) => p.id === projectId);
    createTask.mutate({
      title: pendingTitle,
      status: taskDate ? "todo" : "inbox",
      scheduled_date: taskDate || null,
      project_id: project?.id ?? null,
      area_id: project?.area_id ?? null,
    });
    resetPending();
  }

  function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!remindDate || !remindTime || !pendingTitle) return;
    createReminder.mutate({
      linkedType: projectId ? "project" : "standalone",
      linkedId: projectId || undefined,
      remindAt: new Date(`${remindDate}T${remindTime}`).toISOString(),
      title: pendingTitle,
    });
    resetPending();
  }

  if (pendingTitle && mode === "task") {
    return (
      <form onSubmit={handleCreateTask} className="flex min-w-0 flex-1 max-w-md items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm">
        <span className="shrink-0 truncate text-neutral-600">「{pendingTitle}」</span>
        <input
          type="date"
          autoFocus
          value={taskDate}
          onChange={(e) => setTaskDate(e.target.value)}
          className="shrink-0 text-xs outline-none"
        />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="min-w-0 flex-1 text-xs text-neutral-500 outline-none"
        >
          <option value="">不掛 Project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="shrink-0 rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white">
          新增
        </button>
        <button type="button" onClick={resetPending} className="shrink-0 text-xs text-neutral-400">
          取消
        </button>
      </form>
    );
  }

  if (pendingTitle && mode === "reminder") {
    return (
      <form onSubmit={handleCreateReminder} className="flex min-w-0 flex-1 max-w-md items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm">
        <span className="shrink-0 truncate text-neutral-600">「{pendingTitle}」</span>
        <input
          type="date"
          required
          autoFocus
          value={remindDate}
          onChange={(e) => setRemindDate(e.target.value)}
          className="shrink-0 text-xs outline-none"
        />
        <TimePicker value={remindTime || null} onChange={setRemindTime} className="w-24 shrink-0 text-xs" />
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="min-w-0 flex-1 text-xs text-neutral-500 outline-none"
        >
          <option value="">不掛 Project（不會顯示在 Calendar）</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button type="submit" className="shrink-0 rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white">
          新增
        </button>
        <button type="button" onClick={resetPending} className="shrink-0 text-xs text-neutral-400">
          取消
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 max-w-md items-center gap-1.5">
      <div className="flex shrink-0 gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5">
        {(["todo", "task", "reminder"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            title={m === "todo" ? "新增 Todo（進收集箱）" : m === "task" ? "新增 Task（可選日期／Project）" : "新增提醒"}
            className={`rounded px-1.5 py-1 text-xs ${mode === m ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-700"}`}
          >
            {m === "todo" ? (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 8.5h3l1.2 2h2.6l1.2-2h3" />
                <path d="M2.5 8.5 3.6 3h8.8l1.1 5.5v4A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5z" />
              </svg>
            ) : m === "task" ? (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
                <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2.5a3.2 3.2 0 0 0-3.2 3.2c0 3.7-1.5 4.8-1.5 4.8h9.4s-1.5-1.1-1.5-4.8A3.2 3.2 0 0 0 8 2.5Z" />
                <path d="M6.6 12.7a1.4 1.4 0 0 0 2.8 0" />
              </svg>
            )}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          mode === "todo" ? "+ 新增 Todo…按 Enter 儲存" : mode === "task" ? "+ 新增 Task…按 Enter 選日期" : "+ 新增提醒…按 Enter 選時間"
        }
        className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
      />
    </form>
  );
}
