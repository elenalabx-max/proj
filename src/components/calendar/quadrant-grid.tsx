"use client";

import { useRef } from "react";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useFollowUpsInRange, useDelegateDeadlinesInRange, useUpdateTask, followUpLabel, delegateDeadlineLabel } from "@/hooks/use-tasks";
import { useTodosForDate, useUpdateTodo } from "@/hooks/use-todos";
import { useRemindersOnDate, useUpdateReminder } from "@/hooks/use-reminders";
import { useRecurringOccurrences } from "@/hooks/use-recurrence";
import { useRecurringTodoOccurrences } from "@/hooks/use-todo-recurrence";
import { useRecurringReminderOccurrences } from "@/hooks/use-reminder-recurrence";
import { useTaskColorResolver, useReminderColorResolver } from "@/hooks/use-task-color";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useTodoPanelStore } from "@/stores/todo-panel";
import { useReminderPanelStore } from "@/stores/reminder-panel";
import { toISODate } from "@/lib/date";

const QUADRANTS = [
  { key: "iu", important: true, urgent: true, label: "重要且緊急", color: "#e03131", icon: "M9 1.5 3 9h4l-1 5.5L13 7H9l1-5.5Z" },
  { key: "inu", important: true, urgent: false, label: "重要且不緊急", color: "#e8a30c", icon: "M8 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM8 5.5v3l2 1.5" },
  { key: "niu", important: false, urgent: true, label: "不重要且緊急", color: "#1c7ed6", icon: "M3 8h9M8 4l4 4-4 4" },
  { key: "ninu", important: false, urgent: false, label: "不重要且不緊急", color: "#6b7280", icon: "M2 3.5h12v3H2zM3 6.5V12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6.5M6.5 9h3" },
] as const;

type ItemKind = "task" | "todo" | "reminder" | "followup" | "deadline";
const KIND_LABEL: Record<ItemKind, string> = { task: "Task", todo: "Todo", reminder: "提醒", followup: "Follow-up", deadline: "對方 Deadline" };

type QuadrantItem = {
  kind: ItemKind;
  id: string;
  title: string;
  subtitle: string | null;
  important: boolean;
  urgent: boolean;
  color: string;
  areaType: "personal" | "work" | null;
  projectName: string | null;
  onOpen: () => void;
};

type DragItem = { kind: ItemKind; id: string };

// 四象限是 Day View 的另一種呈現方式（同一天的資料），只是不再分 Work/Personal 兩欄，
// 改成用 important/urgent 分。Task／Todo／Reminder 都能拖進來分類，拖到別的象限會
// 直接改對應那筆資料的 important/urgent 欄位。
export function QuadrantGrid({ date }: { date: Date }) {
  const iso = toISODate(date);
  const { data: tasks } = useTasksInRange(iso, iso);
  const { data: followUps } = useFollowUpsInRange(iso, iso);
  const { data: deadlines } = useDelegateDeadlinesInRange(iso, iso);
  const { data: todos } = useTodosForDate(iso);
  const { data: reminders } = useRemindersOnDate(iso);
  const { data: taskOccurrences } = useRecurringOccurrences(iso, iso);
  const { data: todoOccurrences } = useRecurringTodoOccurrences(iso, iso);
  const { data: reminderOccurrences } = useRecurringReminderOccurrences(iso, iso);
  const { areaTypeOf, colorOf, projectOf } = useTaskColorResolver();
  const reminderResolver = useReminderColorResolver();
  const updateTask = useUpdateTask();
  const updateTodo = useUpdateTodo();
  const updateReminder = useUpdateReminder();
  const openTask = useTaskPanelStore((s) => s.open);
  const openTodo = useTodoPanelStore((s) => s.open);
  const openReminder = useReminderPanelStore((s) => s.open);

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const hiddenProjectIds = useCalendarFilterStore((s) => s.hiddenProjectIds);
  const isProjectVisible = (id: string) => !hiddenProjectIds.has(id);

  const dragRef = useRef<DragItem | null>(null);

  function passesFilter(areaType: "personal" | "work" | null, projectId: string | null) {
    if (areaType === "personal") return showPersonal;
    if (areaType === "work") return showWork && (!projectId || isProjectVisible(projectId));
    return showPersonal || showWork;
  }

  const taskItems: QuadrantItem[] = (tasks ?? [])
    .filter((t) => !t.recurrence_rule_id)
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({
      kind: "task",
      id: t.id,
      title: t.title,
      subtitle: null,
      important: t.important,
      urgent: t.urgent,
      color: colorOf(t),
      areaType: areaTypeOf(t),
      projectName: projectOf(t)?.name ?? null,
      onOpen: () => openTask(t.id),
    }));

  const todoItems: QuadrantItem[] = (todos ?? [])
    .filter((t) => !t.recurrence_rule_id)
    .filter((t) => !t.completed_at) // 四象限是分類用的，完成的不用留著佔位置
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({
      kind: "todo",
      id: t.id,
      title: t.title,
      subtitle: null,
      important: t.important,
      urgent: t.urgent,
      color: colorOf(t),
      areaType: areaTypeOf(t),
      projectName: projectOf(t)?.name ?? null,
      onOpen: () => openTodo(t.id),
    }));

  const reminderItems: QuadrantItem[] = (reminders ?? [])
    .filter((r) => !r.recurrence_rule_id)
    .filter((r) => passesFilter(reminderResolver.areaTypeOf(r), reminderResolver.projectOf(r)?.id ?? null))
    .map((r) => ({
      kind: "reminder",
      id: r.id,
      title: r.title ?? r.note ?? "提醒",
      subtitle: r.is_all_day
        ? "整天"
        : new Date(r.remind_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      important: r.important,
      urgent: r.urgent,
      color: reminderResolver.colorOf(r),
      areaType: reminderResolver.areaTypeOf(r),
      projectName: reminderResolver.projectOf(r)?.name ?? null,
      onOpen: () => openReminder(r.id),
    }));

  // Follow-up 是 Task 本身，直接用 useTaskColorResolver 就能算顏色/Area，不用
  // 像 Reminder 繞道 Project。四象限用它自己的 important/urgent 分類，跟一般
  // Task 一致——拖曳到別的象限一樣是改這筆 Task 的欄位。
  const followUpItems: QuadrantItem[] = (followUps ?? [])
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({
      kind: "followup",
      id: t.id,
      title: followUpLabel(t),
      subtitle: new Date(t.follow_up_at!).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      important: t.important,
      urgent: t.urgent,
      color: colorOf(t),
      areaType: areaTypeOf(t),
      projectName: projectOf(t)?.name ?? null,
      onOpen: () => openTask(t.id),
    }));

  const deadlineItems: QuadrantItem[] = (deadlines ?? [])
    .filter((t) => passesFilter(areaTypeOf(t), t.project_id))
    .map((t) => ({
      kind: "deadline",
      id: t.id,
      title: delegateDeadlineLabel(t),
      subtitle: new Date(t.delegate_deadline!).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      important: t.important,
      urgent: t.urgent,
      color: colorOf(t),
      areaType: areaTypeOf(t),
      projectName: projectOf(t)?.name ?? null,
      onOpen: () => openTask(t.id),
    }));

  // 重複展開出來的那次，important/urgent／點開／拖曳都對應到 master 那筆
  // ——四象限是「這件事的分類」，不是像完成狀態那種需要分次記錄的東西，
  // 拖一次等於重新分類整個重複系列。
  const taskOccurrenceItems: QuadrantItem[] = (taskOccurrences ?? [])
    .filter((o) => passesFilter(areaTypeOf(o.masterTask), o.masterTask.project_id))
    .map((o) => ({
      kind: "task",
      id: o.masterTask.id,
      title: o.title,
      subtitle: null,
      important: o.masterTask.important,
      urgent: o.masterTask.urgent,
      color: colorOf(o.masterTask),
      areaType: areaTypeOf(o.masterTask),
      projectName: projectOf(o.masterTask)?.name ?? null,
      onOpen: () => openTask(o.masterTask.id),
    }));

  const todoOccurrenceItems: QuadrantItem[] = (todoOccurrences ?? [])
    .filter((o) => passesFilter(areaTypeOf(o.masterTodo), o.masterTodo.project_id))
    .map((o) => ({
      kind: "todo",
      id: o.masterTodo.id,
      title: o.title,
      subtitle: null,
      important: o.masterTodo.important,
      urgent: o.masterTodo.urgent,
      color: colorOf(o.masterTodo),
      areaType: areaTypeOf(o.masterTodo),
      projectName: projectOf(o.masterTodo)?.name ?? null,
      onOpen: () => openTodo(o.masterTodo.id),
    }));

  const reminderOccurrenceItems: QuadrantItem[] = (reminderOccurrences ?? [])
    .filter((o) => passesFilter(reminderResolver.areaTypeOf(o.masterReminder), reminderResolver.projectOf(o.masterReminder)?.id ?? null))
    .map((o) => ({
      kind: "reminder",
      id: o.masterReminder.id,
      title: o.title,
      subtitle: o.isAllDay ? "整天" : new Date(o.remindAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
      important: o.masterReminder.important,
      urgent: o.masterReminder.urgent,
      color: reminderResolver.colorOf(o.masterReminder),
      areaType: reminderResolver.areaTypeOf(o.masterReminder),
      projectName: reminderResolver.projectOf(o.masterReminder)?.name ?? null,
      onOpen: () => openReminder(o.masterReminder.id),
    }));

  const items = [
    ...taskItems,
    ...todoItems,
    ...reminderItems,
    ...followUpItems,
    ...deadlineItems,
    ...taskOccurrenceItems,
    ...todoOccurrenceItems,
    ...reminderOccurrenceItems,
  ];

  function itemsFor(important: boolean, urgent: boolean) {
    return items.filter((i) => i.important === important && i.urgent === urgent);
  }

  function handleDrop(important: boolean, urgent: boolean) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.kind === "task" || d.kind === "followup" || d.kind === "deadline") updateTask.mutate({ id: d.id, patch: { important, urgent } });
    else if (d.kind === "todo") updateTodo.mutate({ id: d.id, patch: { important, urgent } });
    else updateReminder.mutate({ id: d.id, patch: { important, urgent } });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {QUADRANTS.map((q) => (
        <div
          key={q.key}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(q.important, q.urgent);
          }}
          className="min-h-[180px] rounded-lg border border-neutral-200 bg-white p-3"
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: `${q.color}22`, color: q.color }}
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={q.icon} />
              </svg>
            </span>
            {q.label}
          </div>

          <div className="space-y-1">
            {itemsFor(q.important, q.urgent).map((item) => (
              <QuadrantCard key={`${item.kind}:${item.id}`} item={item} dragRef={dragRef} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuadrantCard({ item, dragRef }: { item: QuadrantItem; dragRef: React.MutableRefObject<DragItem | null> }) {
  const moved = useRef(false);

  return (
    <button
      draggable
      onDragStart={() => {
        dragRef.current = { kind: item.kind, id: item.id };
        moved.current = true;
      }}
      onClick={() => {
        if (!moved.current) item.onOpen();
      }}
      onPointerDown={() => {
        moved.current = false;
      }}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-neutral-50"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
      <span className="min-w-0 flex-1">
        <div className="truncate font-medium text-neutral-900">
          {item.subtitle && <span className="mr-1 font-mono text-neutral-400">{item.subtitle}</span>}
          {item.title}
        </div>
        <div className="truncate text-[10px] text-neutral-400">
          {KIND_LABEL[item.kind]}
          {item.areaType ? ` · ${item.areaType === "personal" ? "個人" : "工作"}` : ""}
          {item.projectName ? ` · ${item.projectName}` : ""}
        </div>
      </span>
    </button>
  );
}
