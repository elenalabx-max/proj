"use client";

import { isToday } from "date-fns";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useTodosInRange } from "@/hooks/use-todos";
import { useRemindersInRange } from "@/hooks/use-reminders";
import { useRecurringOccurrences, useSetOccurrenceCompleted } from "@/hooks/use-recurrence";
import { useRecurringTodoOccurrences, useSetTodoOccurrenceCompleted } from "@/hooks/use-todo-recurrence";
import { useRecurringReminderOccurrences, useSetReminderOccurrenceCompleted } from "@/hooks/use-reminder-recurrence";
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
  const { data: taskOccurrences } = useRecurringOccurrences(start, end);
  const { data: todoOccurrences } = useRecurringTodoOccurrences(start, end);
  const { data: reminderOccurrences } = useRecurringReminderOccurrences(start, end);
  const { areaTypeOf, colorOf } = useTaskColorResolver();
  const reminderResolver = useReminderColorResolver();
  const openTask = useTaskPanelStore((s) => s.open);
  const openTodo = useTodoPanelStore((s) => s.open);
  const openReminder = useReminderPanelStore((s) => s.open);
  const setOccurrenceCompleted = useSetOccurrenceCompleted();
  const setTodoOccurrenceCompleted = useSetTodoOccurrenceCompleted();
  const setReminderOccurrenceCompleted = useSetReminderOccurrenceCompleted();

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const hiddenProjectIds = useCalendarFilterStore((s) => s.hiddenProjectIds);
  const isProjectVisible = (id: string) => !hiddenProjectIds.has(id);

  function passesFilter(areaType: "personal" | "work" | null, projectId: string | null) {
    if (areaType === "personal") return showPersonal;
    if (areaType === "work") return showWork && (!projectId || isProjectVisible(projectId));
    return showPersonal || showWork;
  }

  // 有掛 recurrence_rule_id 的 master 改由下面的 occurrences 展開，避免重複顯示。
  const taskItems: WeekItem[] = (tasks ?? [])
    .filter((t) => !t.recurrence_rule_id)
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
    .filter((t) => !t.recurrence_rule_id)
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
    .filter((r) => !r.recurrence_rule_id)
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

  // 重複展開出來的那次沒有自己的 row，點一下直接切換完成/取消完成——
  // 跟 Day/3 Days 時間軸的 occurrence 互動邏輯一致，不會另外開面板。
  const taskOccurrenceItems: WeekItem[] = (taskOccurrences ?? [])
    .filter((o) => passesFilter(areaTypeOf(o.masterTask), o.masterTask.project_id))
    .map((o) => ({
      kind: "task",
      id: o.id,
      date: o.date,
      title: o.title,
      color: colorOf(o.masterTask),
      timeLabel: !o.is_all_day && o.scheduled_start ? o.scheduled_start.slice(0, 5) : null,
      sortKey: !o.is_all_day && o.scheduled_start ? o.scheduled_start : "",
      onOpen: () =>
        setOccurrenceCompleted.mutate({
          ruleId: o.masterTask.recurrence_rule_id!,
          taskId: o.masterTask.id,
          date: o.date,
          completed: !o.completed,
        }),
    }));

  const todoOccurrenceItems: WeekItem[] = (todoOccurrences ?? [])
    .filter((o) => passesFilter(areaTypeOf(o.masterTodo), o.masterTodo.project_id))
    .map((o) => ({
      kind: "todo",
      id: o.id,
      date: o.date,
      title: o.title,
      color: colorOf(o.masterTodo),
      timeLabel: null,
      sortKey: "",
      onOpen: () =>
        setTodoOccurrenceCompleted.mutate({
          ruleId: o.masterTodo.recurrence_rule_id!,
          todoId: o.masterTodo.id,
          date: o.date,
          completed: !o.completed,
        }),
    }));

  const reminderOccurrenceItems: WeekItem[] = (reminderOccurrences ?? [])
    .filter((o) => passesFilter(reminderResolver.areaTypeOf(o.masterReminder), reminderResolver.projectOf(o.masterReminder)?.id ?? null))
    .map((o) => {
      const d = new Date(o.remindAt);
      const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return {
        kind: "reminder",
        id: o.id,
        date: o.date,
        title: o.title,
        color: reminderResolver.colorOf(o.masterReminder),
        timeLabel: o.isAllDay ? null : hhmm,
        sortKey: o.isAllDay ? "" : hhmm,
        onOpen: () =>
          setReminderOccurrenceCompleted.mutate({
            ruleId: o.masterReminder.recurrence_rule_id!,
            reminderId: o.masterReminder.id,
            date: o.date,
            completed: !o.completed,
          }),
      };
    });

  const items = [
    ...taskItems,
    ...todoItems,
    ...reminderItems,
    ...taskOccurrenceItems,
    ...todoOccurrenceItems,
    ...reminderOccurrenceItems,
  ];

  const labels = weekdayLabels(1);

  return (
    <div className={`grid gap-2 ${dates.length === 1 ? "grid-cols-1" : "grid-cols-7"}`}>
      {dates.map((date, i) => {
        const iso = toISODate(date);
        const dayItems = items.filter((it) => it.date === iso).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        return (
          <div
            key={iso}
            className={`min-h-[140px] rounded-lg border p-2 ${
              isToday(date) ? "border-neutral-300 bg-neutral-900/5" : "border-neutral-200 bg-white"
            }`}
          >
            <div className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${isToday(date) ? "text-neutral-900" : "text-neutral-500"}`}>
              <span>
                {labels[i]} <span className="font-mono">{date.getDate()}</span>
              </span>
              {isToday(date) && (
                <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">今天</span>
              )}
            </div>
            <div className="space-y-1">
              {dayItems.map((it) => {
                // Todo／Reminder 都用淺底 + 照分類顏色上色的圖示，呈現方式互相一致；
                // Task 才是真的排定時段，維持原本滿版色塊的畫法跟兩者區分開來。
                if (it.kind === "todo" || it.kind === "reminder") {
                  const Icon = it.kind === "todo" ? TodoDotIcon : ReminderDotIcon;
                  return (
                    <button
                      key={`${it.kind}:${it.id}`}
                      onClick={it.onOpen}
                      className="flex w-full items-center gap-1.5 truncate rounded px-1.5 py-1 text-left text-[11px] font-medium hover:bg-neutral-50"
                      style={{ color: it.color }}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {it.timeLabel && <span className="font-mono opacity-70">{it.timeLabel} </span>}
                        {it.title}
                      </span>
                    </button>
                  );
                }
                const fg = getContrastTextColor(it.color);
                return (
                  <button
                    key={`${it.kind}:${it.id}`}
                    onClick={it.onOpen}
                    className="flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-[11px] font-medium"
                    style={{ background: it.color, color: fg }}
                  >
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
