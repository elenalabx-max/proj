"use client";

import { useRouter } from "next/navigation";
import { isSameMonth, isToday } from "date-fns";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useFollowUpsInRange, followUpLabel } from "@/hooks/use-tasks";
import { useTodosInRange } from "@/hooks/use-todos";
import { useRemindersInRange } from "@/hooks/use-reminders";
import { useRecurringOccurrences } from "@/hooks/use-recurrence";
import { useRecurringTodoOccurrences } from "@/hooks/use-todo-recurrence";
import { useRecurringReminderOccurrences } from "@/hooks/use-reminder-recurrence";
import { useTaskColorResolver, useReminderColorResolver } from "@/hooks/use-task-color";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { TodoDotIcon, ReminderDotIcon, FollowUpIcon } from "@/components/ui/glyphs";
import { toISODate, weekdayLabels } from "@/lib/date";

const MAX_VISIBLE_PER_DAY = 3;

type MonthItem = { kind: "task" | "todo" | "reminder" | "followup"; id: string; date: string; title: string; color: string };

export function MonthGrid({ reference, dates }: { reference: Date; dates: Date[] }) {
  const router = useRouter();
  const start = toISODate(dates[0]);
  const end = toISODate(dates[dates.length - 1]);
  const { data: tasks } = useTasksInRange(start, end);
  const { data: followUps } = useFollowUpsInRange(start, end);
  const { data: todos } = useTodosInRange(start, end);
  const { data: reminders } = useRemindersInRange(start, end);
  const { data: taskOccurrences } = useRecurringOccurrences(start, end);
  const { data: todoOccurrences } = useRecurringTodoOccurrences(start, end);
  const { data: reminderOccurrences } = useRecurringReminderOccurrences(start, end);
  const { areaTypeOf, colorOf } = useTaskColorResolver();
  const reminderResolver = useReminderColorResolver();

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
  const taskItems: MonthItem[] = (tasks ?? [])
    .filter((t) => !t.recurrence_rule_id)
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({ kind: "task", id: t.id, date: t.scheduled_date!, title: t.title, color: colorOf(t) }));

  const todoItems: MonthItem[] = (todos ?? [])
    .filter((t) => !t.recurrence_rule_id)
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({ kind: "todo", id: t.id, date: t.date!, title: t.title, color: colorOf(t) }));

  const followUpItems: MonthItem[] = (followUps ?? [])
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => {
      const d = new Date(t.follow_up_at!);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { kind: "followup", id: t.id, date: iso, title: followUpLabel(t), color: colorOf(t) };
    });

  const reminderItems: MonthItem[] = (reminders ?? [])
    .filter((r) => !r.recurrence_rule_id)
    .filter((r) => passesFilter(reminderResolver.areaTypeOf(r), reminderResolver.projectOf(r)?.id ?? null))
    .map((r) => {
      const d = new Date(r.remind_at);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { kind: "reminder", id: r.id, date: iso, title: r.title ?? r.note ?? "提醒", color: reminderResolver.colorOf(r) };
    });

  const taskOccurrenceItems: MonthItem[] = (taskOccurrences ?? [])
    .filter((o) => passesFilter(areaTypeOf(o.masterTask), o.masterTask.project_id))
    .map((o) => ({ kind: "task", id: o.id, date: o.date, title: o.title, color: colorOf(o.masterTask) }));

  const todoOccurrenceItems: MonthItem[] = (todoOccurrences ?? [])
    .filter((o) => passesFilter(areaTypeOf(o.masterTodo), o.masterTodo.project_id))
    .map((o) => ({ kind: "todo", id: o.id, date: o.date, title: o.title, color: colorOf(o.masterTodo) }));

  const reminderOccurrenceItems: MonthItem[] = (reminderOccurrences ?? [])
    .filter((o) => passesFilter(reminderResolver.areaTypeOf(o.masterReminder), reminderResolver.projectOf(o.masterReminder)?.id ?? null))
    .map((o) => ({ kind: "reminder", id: o.id, date: o.date, title: o.title, color: reminderResolver.colorOf(o.masterReminder) }));

  const items = [
    ...taskItems,
    ...todoItems,
    ...reminderItems,
    ...followUpItems,
    ...taskOccurrenceItems,
    ...todoOccurrenceItems,
    ...reminderOccurrenceItems,
  ];

  const labels = weekdayLabels(1);

  return (
    // 手機寬度固定 7 欄會擠爆，改成外層可以橫向滑動、內層有個最小寬度撐住每
    // 一欄的可讀性——桌面版寬度夠不會觸發捲動，行為不變。
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <div className="min-w-[640px]">
      <div className="grid grid-cols-7 border-b border-neutral-200 text-xs font-semibold text-neutral-500">
        {labels.map((l) => (
          <div key={l} className="px-2 py-1.5 text-center">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const iso = toISODate(date);
          const dayItems = items.filter((i) => i.date === iso);
          const shown = dayItems.slice(0, MAX_VISIBLE_PER_DAY);
          const extra = dayItems.length - shown.length;
          const inMonth = isSameMonth(date, reference);

          return (
            <button
              key={iso}
              onClick={() => router.push(`/calendar/3days?date=${iso}`)}
              className={`flex min-h-[92px] flex-col items-stretch justify-start border-b border-r border-neutral-100 p-1.5 text-left hover:bg-neutral-50 ${
                inMonth ? "" : "bg-neutral-50/60"
              }`}
            >
              <div
                className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-mono ${
                  isToday(date) ? "bg-neutral-900 text-white" : inMonth ? "text-neutral-700" : "text-neutral-300"
                }`}
              >
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {shown.map((i) =>
                  i.kind === "task" ? (
                    <div key={`${i.kind}:${i.id}`} className="flex items-center gap-1 truncate text-[10px] text-neutral-600">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: i.color }} />
                      <span className="truncate">{i.title}</span>
                    </div>
                  ) : (
                    <div key={`${i.kind}:${i.id}`} className="flex items-center gap-1 truncate text-[10px]" style={{ color: i.color }}>
                      {i.kind === "todo" ? (
                        <TodoDotIcon className="h-2.5 w-2.5 shrink-0" />
                      ) : i.kind === "reminder" ? (
                        <ReminderDotIcon className="h-2.5 w-2.5 shrink-0" />
                      ) : (
                        <FollowUpIcon className="h-2.5 w-2.5 shrink-0" />
                      )}
                      <span className="truncate">{i.title}</span>
                    </div>
                  ),
                )}
                {extra > 0 && <div className="text-[10px] text-neutral-400">+{extra} more</div>}
              </div>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
