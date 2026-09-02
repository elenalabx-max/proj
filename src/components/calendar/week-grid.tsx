"use client";

import { isToday } from "date-fns";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useTodosInRange } from "@/hooks/use-todos";
import { useRemindersInRange } from "@/hooks/use-reminders";
import { useTaskColorResolver, useReminderColorResolver } from "@/hooks/use-task-color";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useTodoPanelStore } from "@/stores/todo-panel";
import { useReminderPanelStore } from "@/stores/reminder-panel";
import { TodoDotIcon, ReminderDotIcon } from "@/components/ui/glyphs";
import { getContrastTextColor } from "@/lib/colors";
import { toISODate, weekdayLabels } from "@/lib/date";

type WeekItem = {
  kind: "task" | "todo" | "reminder";
  id: string;
  date: string;
  title: string;
  color: string;
  timeLabel: string | null;
  sortKey: string;
  onOpen: () => void;
};

// Week 目前是簡化的每日清單（依時間排序），不含 Day 那種可拖曳/縮放的時間格。
// 之後如果需要跨日拖曳，再把這裡換成跟 Day 一樣的時間格引擎。
export function WeekGrid({ dates }: { dates: Date[] }) {
  const start = toISODate(dates[0]);
  const end = toISODate(dates[dates.length - 1]);
  const { data: tasks } = useTasksInRange(start, end);
  const { data: todos } = useTodosInRange(start, end);
  const { data: reminders } = useRemindersInRange(start, end);
  const { areaTypeOf, colorOf } = useTaskColorResolver();
  const reminderResolver = useReminderColorResolver();
  const openTask = useTaskPanelStore((s) => s.open);
  const openTodo = useTodoPanelStore((s) => s.open);
  const openReminder = useReminderPanelStore((s) => s.open);

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const hiddenProjectIds = useCalendarFilterStore((s) => s.hiddenProjectIds);
  const isProjectVisible = (id: string) => !hiddenProjectIds.has(id);

  function passesFilter(areaType: "personal" | "work" | null, projectId: string | null) {
    if (areaType === "personal") return showPersonal;
    if (areaType === "work") return showWork && (!projectId || isProjectVisible(projectId));
    return showPersonal || showWork;
  }

  const taskItems: WeekItem[] = (tasks ?? [])
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({
      kind: "task",
      id: t.id,
      date: t.scheduled_date!,
      title: t.title,
      color: colorOf(t),
      timeLabel: !t.is_all_day && t.scheduled_start ? t.scheduled_start.slice(0, 5) : null,
      sortKey: !t.is_all_day && t.scheduled_start ? t.scheduled_start : "",
      onOpen: () => openTask(t.id),
    }));

  const todoItems: WeekItem[] = (todos ?? [])
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({
      kind: "todo",
      id: t.id,
      date: t.date!,
      title: t.title,
      color: colorOf(t),
      timeLabel: null,
      sortKey: "",
      onOpen: () => openTodo(t.id),
    }));

  const reminderItems: WeekItem[] = (reminders ?? [])
    .filter((r) => passesFilter(reminderResolver.areaTypeOf(r), reminderResolver.projectOf(r)?.id ?? null))
    .map((r) => {
      const d = new Date(r.remind_at);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return {
        kind: "reminder",
        id: r.id,
        date: iso,
        title: r.title ?? r.note ?? "提醒",
        color: reminderResolver.colorOf(r),
        timeLabel: r.is_all_day ? null : hhmm,
        sortKey: r.is_all_day ? "" : hhmm,
        onOpen: () => openReminder(r.id),
      };
    });

  const items = [...taskItems, ...todoItems, ...reminderItems];

  const labels = weekdayLabels(1);

  return (
    <div className={`grid gap-2 ${dates.length === 1 ? "grid-cols-1" : "grid-cols-7"}`}>
      {dates.map((date, i) => {
        const iso = toISODate(date);
        const dayItems = items.filter((it) => it.date === iso).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        return (
          <div key={iso} className="min-h-[140px] rounded-lg border border-neutral-200 bg-white p-2">
            <div className={`mb-1.5 text-xs font-semibold ${isToday(date) ? "text-neutral-900" : "text-neutral-500"}`}>
              {labels[i]} <span className="font-mono">{date.getDate()}</span>
            </div>
            <div className="space-y-1">
              {dayItems.map((it) => {
                const fg = getContrastTextColor(it.color);
                return (
                  <button
                    key={`${it.kind}:${it.id}`}
                    onClick={it.onOpen}
                    className="flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[11px] font-medium"
                    style={{ background: it.color, color: fg }}
                  >
                    {it.kind === "todo" && <TodoDotIcon className="h-3 w-3 shrink-0" />}
                    {it.kind === "reminder" && <ReminderDotIcon className="h-3 w-3 shrink-0" />}
                    <span className="truncate">
                      {it.timeLabel && <span className="font-mono opacity-85">{it.timeLabel} </span>}
                      {it.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
