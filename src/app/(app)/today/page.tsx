"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useTodosForDate, useCompleteTodo } from "@/hooks/use-todos";
import { useReviewTasks } from "@/hooks/use-tasks";
import { useRemindersOnDate } from "@/hooks/use-reminders";
import { useTaskPanelStore } from "@/stores/task-panel";
import { MultiDayTimeline } from "@/components/calendar/multi-day-timeline";
import { QuadrantGrid } from "@/components/calendar/quadrant-grid";
import { AreaProjectFilter } from "@/components/calendar/area-project-filter";
import { CheckboxIcon } from "@/components/ui/checkbox";
import { toISODate } from "@/lib/date";

const CalendarGlyph = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
    <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" />
  </svg>
);
const TodoGlyph = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="10" height="10" rx="2" />
    <path d="M5.5 8.2 7.2 10 10.5 6.2" />
  </svg>
);
const ReviewGlyph = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const ReminderGlyph = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2.5a3.2 3.2 0 0 0-3.2 3.2c0 3.7-1.5 4.8-1.5 4.8h9.4s-1.5-1.1-1.5-4.8A3.2 3.2 0 0 0 8 2.5Z" />
    <path d="M6.6 12.7a1.4 1.4 0 0 0 2.8 0" />
  </svg>
);

function SummaryCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
        {icon}
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-neutral-300">—</p>;
}

export default function TodayPage() {
  const today = new Date();
  const iso = toISODate(today);
  const router = useRouter();

  const { data: tasks } = useTasksInRange(iso, iso);
  const { data: todos } = useTodosForDate(iso);
  const { data: reviewTasks } = useReviewTasks();
  const { data: reminders } = useRemindersOnDate(iso);
  const openTask = useTaskPanelStore((s) => s.open);
  const completeTodo = useCompleteTodo();

  const [view, setView] = useState<"timeline" | "quadrant">("timeline");

  const scheduled = (tasks ?? [])
    .filter((t) => !t.is_all_day && t.scheduled_start && t.status !== "completed")
    .sort((a, b) => (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Today</h1>
        <span className="font-mono text-sm text-neutral-400">{format(today, "yyyy / MM / dd")}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<CalendarGlyph />} title="今天排程">
          {scheduled.length === 0 && <Empty />}
          {scheduled.map((t) => (
            <button key={t.id} onClick={() => openTask(t.id)} className="flex w-full items-start gap-1.5 text-left text-xs hover:underline">
              <span className="shrink-0 font-mono text-neutral-400">{t.scheduled_start?.slice(0, 5)}</span>
              <span className="truncate text-neutral-800">{t.title}</span>
            </button>
          ))}
        </SummaryCard>

        <SummaryCard icon={<TodoGlyph />} title="今天 Todo">
          {todos?.length === 0 && <Empty />}
          {todos?.map((t) => (
            <label key={t.id} className="flex items-center gap-1.5 text-xs text-neutral-800">
              <button type="button" onClick={() => completeTodo.mutate({ id: t.id, completed: true })}>
                <CheckboxIcon checked={false} />
              </button>
              <span className="truncate">{t.title}</span>
            </label>
          ))}
        </SummaryCard>

        <SummaryCard icon={<ReviewGlyph />} title="待我確認">
          {reviewTasks?.length === 0 && <Empty />}
          {reviewTasks?.map((t) => (
            <button key={t.id} onClick={() => router.push("/review")} className="flex w-full items-start gap-1.5 text-left text-xs hover:underline">
              <span className="truncate text-neutral-800">{t.title}</span>
            </button>
          ))}
        </SummaryCard>

        <SummaryCard icon={<ReminderGlyph />} title="提醒">
          {reminders?.length === 0 && <Empty />}
          {reminders?.map((r) => (
            <button
              key={r.id}
              onClick={() => r.linked_type === "task" && r.linked_id && openTask(r.linked_id)}
              className="flex w-full items-start gap-1.5 text-left text-xs hover:underline"
            >
              <span className="shrink-0 font-mono text-neutral-400">
                {new Date(r.remind_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="truncate text-neutral-800">{r.title ?? r.note ?? "提醒"}</span>
            </button>
          ))}
        </SummaryCard>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Day Timeline</h2>
          <div className="flex gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
            {(["timeline", "quadrant"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-3 py-1 text-xs font-medium ${
                  view === v ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {v === "timeline" ? "時間軸" : "四象限"}
              </button>
            ))}
          </div>
        </div>

        <AreaProjectFilter />

        {view === "timeline" ? <MultiDayTimeline dates={[today]} /> : <QuadrantGrid date={today} />}
      </div>
    </div>
  );
}
