"use client";

import { useState } from "react";
import { useCreateTodo } from "@/hooks/use-todos";
import { useCreateReminder } from "@/hooks/use-reminders";
import { useProjects } from "@/hooks/use-projects";
import { TimePicker } from "@/components/ui/time-picker";

type Mode = "todo" | "reminder";

// 全站快速新增：只要標題，Enter 就送進 Inbox（見規劃書第 38 節）。
// 預設建立 Todo；切到「提醒」模式則建立獨立提醒（不用先掛在某個 Task 上）——
// 提醒一定要有時間，所以標題送出後會多一步選時間（可選加 Project）才真的存檔。
// 有掛 Project 的提醒才會畫在 Calendar 上（沒有 Project 就不知道要畫在 Work 還 Personal 欄）。
export function QuickAdd() {
  const [mode, setMode] = useState<Mode>("todo");
  const [value, setValue] = useState("");
  const [pendingTitle, setPendingTitle] = useState<string | null>(null);
  const [remindDate, setRemindDate] = useState("");
  const [remindTime, setRemindTime] = useState("");
  const [projectId, setProjectId] = useState("");
  const createTodo = useCreateTodo();
  const createReminder = useCreateReminder();
  const { data: projects } = useProjects();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = value.trim();
    if (!title) return;

    if (mode === "todo") {
      createTodo.mutate(title);
      setValue("");
    } else {
      setPendingTitle(title); // 等使用者選時間（可選 Project）才真的建立
    }
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
    setPendingTitle(null);
    setValue("");
    setRemindDate("");
    setRemindTime("");
    setProjectId("");
  }

  if (pendingTitle) {
    return (
      <form onSubmit={handleCreateReminder} className="flex flex-1 max-w-md items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm">
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
        <button type="button" onClick={() => setPendingTitle(null)} className="shrink-0 text-xs text-neutral-400">
          取消
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 max-w-md items-center gap-1.5">
      <div className="flex shrink-0 gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5">
        {(["todo", "reminder"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            title={m === "todo" ? "新增 Todo（進收集箱）" : "新增提醒"}
            className={`rounded px-1.5 py-1 text-xs ${mode === m ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-700"}`}
          >
            {m === "todo" ? (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 8.5h3l1.2 2h2.6l1.2-2h3" />
                <path d="M2.5 8.5 3.6 3h8.8l1.1 5.5v4A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5z" />
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
        placeholder={mode === "todo" ? "+ 新增 Todo…按 Enter 儲存" : "+ 新增提醒…按 Enter 選時間"}
        className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
      />
    </form>
  );
}
