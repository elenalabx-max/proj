"use client";

import { useRef, useState } from "react";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useCreateTask, useUpdateTask } from "@/hooks/use-tasks";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useReminderPanelStore } from "@/stores/reminder-panel";
import { useCancelOccurrence, useRecurringOccurrences, useSetOccurrenceCompleted } from "@/hooks/use-recurrence";
import { useProjectRemindersInRange } from "@/hooks/use-reminders";
import { useRecurringReminderOccurrences, useSetReminderOccurrenceCompleted } from "@/hooks/use-reminder-recurrence";
import { getContrastTextColor, resolveTaskColor } from "@/lib/colors";
import { minutesToTime, timeToMinutes, toISODate, WEEKDAY_LABELS_MON_FIRST } from "@/lib/date";
import { layoutOverlaps, type OverlapSlot } from "@/lib/overlap-layout";
import { isTaskOverdue } from "@/lib/overdue";
import type { Task } from "@/lib/types";

const GRID_START_MIN = 360; // 06:00
const GRID_END_MIN = 1380; // 23:00
const GRID_HEIGHT = GRID_END_MIN - GRID_START_MIN;
const SNAP = 15;

function snap(v: number) {
  return Math.round(v / SNAP) * SNAP;
}

function dateLabel(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_LABELS_MON_FIRST[(d.getDay() + 6) % 7]})`;
}


type Block = {
  id: string;
  title: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  is_all_day: boolean;
  date: string;
  areaType: "personal" | "work" | null;
  color: string;
  // 只有真的 Task（非重複展開出來的那次）才能拖曳/縮放；重複的那次只能點一下完成/取消。
  realTask: Task | null;
  occurrence: { ruleId: string; taskId: string; date: string; completed: boolean } | null;
};

type ReminderMarker = {
  id: string;
  title: string;
  time: string;
  top: number;
  color: string;
  completed: boolean;
  // 重複展開出來的那次沒有自己的 reminder row，只能點一下完成/取消，不能打開面板。
  occurrence: { ruleId: string; reminderId: string; date: string } | null;
};

type Column = { key: string; date: string; areaType: "work" | "personal"; label: string; blocks: Block[]; reminders: ReminderMarker[] };

type DragState =
  | { mode: "move"; blockId: string; startY: number; startTop: number; height: number }
  | { mode: "resize"; blockId: string; startY: number; top: number; startHeight: number };

// Day / 3-Day 共用同一顆元件：dates 傳 1 筆就是 Day、傳 3 筆就是 3-Day，
// 每一天內部一律維持 Work｜Personal 兩欄（規劃書第 19 節的硬性規定），
// 拖曳只在同一天同一欄內上下移動，不支援跨欄/跨日拖曳。
export function MultiDayTimeline({ dates }: { dates: Date[] }) {
  const isoList = dates.map(toISODate);
  const rangeStart = isoList[0];
  const rangeEnd = isoList[isoList.length - 1];

  const { data: tasks } = useTasksInRange(rangeStart, rangeEnd);
  const { data: occurrences } = useRecurringOccurrences(rangeStart, rangeEnd);
  const { data: projectReminders } = useProjectRemindersInRange(rangeStart, rangeEnd);
  const { data: reminderOccurrences } = useRecurringReminderOccurrences(rangeStart, rangeEnd);
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const openTask = useTaskPanelStore((s) => s.open);
  const setOccurrenceCompleted = useSetOccurrenceCompleted();
  const cancelOccurrence = useCancelOccurrence();
  const openReminder = useReminderPanelStore((s) => s.open);
  const setReminderOccurrenceCompleted = useSetReminderOccurrenceCompleted();

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  // 選 hiddenProjectIds 本身而不是 isProjectVisible 這個函式參照，見 area-project-filter.tsx 的註解。
  const hiddenProjectIds = useCalendarFilterStore((s) => s.hiddenProjectIds);
  const isProjectVisible = (id: string) => !hiddenProjectIds.has(id);

  const [overridePos, setOverridePos] = useState<{ blockId: string; top: number; height: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);

  function areaTypeOf(areaId: string | null) {
    return areas?.find((a) => a.id === areaId)?.type ?? null;
  }
  function colorFor(areaType: "personal" | "work" | null, projectId: string | null) {
    const project = projects?.find((p) => p.id === projectId);
    return resolveTaskColor({
      areaType,
      projectColor: project?.color,
      personalDefaultColor: settings?.personal_default_color ?? "#9a86ac",
      workFallbackColor: settings?.work_fallback_color ?? "#5b7f9a",
    });
  }
  function isVisible(areaType: "personal" | "work" | null, projectId: string | null) {
    if (areaType === "personal") return showPersonal;
    if (areaType === "work") return showWork && (!projectId || isProjectVisible(projectId));
    return showPersonal || showWork;
  }

  const blocks: Block[] = [];

  for (const t of tasks ?? []) {
    if (t.recurrence_rule_id) continue; // 這種改由下面的 occurrences 展開，避免重複顯示
    if (!t.scheduled_date || !isoList.includes(t.scheduled_date)) continue;
    // 不是全天、但開始/結束時間缺一個的話，這個時間軸畫不出來，先跳過避免整頁壞掉
    // （Task Detail Panel 現在會自動補滿 1 小時，但舊資料或還沒填完的仍可能是這樣）。
    if (!t.is_all_day && (!t.scheduled_start || !t.scheduled_end)) continue;
    const areaType = areaTypeOf(t.area_id);
    if (!isVisible(areaType, t.project_id)) continue;
    blocks.push({
      id: t.id,
      title: t.title,
      scheduled_start: t.scheduled_start,
      scheduled_end: t.scheduled_end,
      is_all_day: t.is_all_day,
      date: t.scheduled_date,
      areaType,
      color: colorFor(areaType, t.project_id),
      realTask: t,
      occurrence: null,
    });
  }

  for (const o of occurrences ?? []) {
    if (!isoList.includes(o.date)) continue;
    if (!o.is_all_day && (!o.scheduled_start || !o.scheduled_end)) continue;
    const areaType = areaTypeOf(o.masterTask.area_id);
    if (!isVisible(areaType, o.masterTask.project_id)) continue;
    blocks.push({
      id: o.id,
      title: o.title,
      scheduled_start: o.scheduled_start,
      scheduled_end: o.scheduled_end,
      is_all_day: o.is_all_day,
      date: o.date,
      areaType,
      color: colorFor(areaType, o.masterTask.project_id),
      realTask: null,
      occurrence: {
        ruleId: o.masterTask.recurrence_rule_id!,
        taskId: o.masterTask.id,
        date: o.date,
        completed: o.completed,
      },
    });
  }

  const isPersonal = (b: Block) => b.areaType === "personal";

  // 有掛 Project 的提醒，換算成使用者本地時區的日期/分鐘數，畫成小標記（不是滿版色塊）。
  const reminderMarkers: (ReminderMarker & { date: string; areaType: "work" | "personal" })[] = [];
  for (const r of projectReminders ?? []) {
    if (r.recurrence_rule_id) continue; // 這種改由下面的 occurrences 展開，避免重複顯示
    if (!r.linked_id) continue;
    const project = projects?.find((p) => p.id === r.linked_id);
    if (!project) continue;
    const areaType = areaTypeOf(project.area_id);
    if (areaType !== "work" && areaType !== "personal") continue;
    if (!isVisible(areaType, project.id)) continue;

    const d = new Date(r.remind_at);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!isoList.includes(localIso)) continue;
    const minutesOfDay = d.getHours() * 60 + d.getMinutes();
    if (minutesOfDay < GRID_START_MIN || minutesOfDay > GRID_END_MIN) continue;

    reminderMarkers.push({
      id: r.id,
      title: r.title ?? "提醒",
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      top: minutesOfDay - GRID_START_MIN,
      color: project.color,
      completed: !!r.completed_at,
      date: localIso,
      areaType,
      occurrence: null,
    });
  }

  for (const o of reminderOccurrences ?? []) {
    if (o.masterReminder.linked_type !== "project" || !o.masterReminder.linked_id) continue;
    const project = projects?.find((p) => p.id === o.masterReminder.linked_id);
    if (!project) continue;
    const areaType = areaTypeOf(project.area_id);
    if (areaType !== "work" && areaType !== "personal") continue;
    if (!isVisible(areaType, project.id)) continue;
    if (!isoList.includes(o.date)) continue;

    const d = new Date(o.remindAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const minutesOfDay = d.getHours() * 60 + d.getMinutes();
    if (minutesOfDay < GRID_START_MIN || minutesOfDay > GRID_END_MIN) continue;

    reminderMarkers.push({
      id: o.id,
      title: o.title,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      top: minutesOfDay - GRID_START_MIN,
      color: project.color,
      completed: o.completed,
      date: o.date,
      areaType,
      occurrence: {
        ruleId: o.masterReminder.recurrence_rule_id!,
        reminderId: o.masterReminder.id,
        date: o.date,
      },
    });
  }

  const dateGroups = isoList.map((iso, i) => {
    const dayBlocks = blocks.filter((b) => b.date === iso);
    const dayReminders = reminderMarkers.filter((r) => r.date === iso);
    const columns: Column[] = [];
    if (showWork) {
      columns.push({
        key: `${iso}:work`,
        date: iso,
        areaType: "work",
        label: "工作",
        blocks: dayBlocks.filter((b) => !isPersonal(b)),
        reminders: dayReminders.filter((r) => r.areaType === "work"),
      });
    }
    if (showPersonal) {
      columns.push({
        key: `${iso}:personal`,
        date: iso,
        areaType: "personal",
        label: "個人",
        blocks: dayBlocks.filter(isPersonal),
        reminders: dayReminders.filter((r) => r.areaType === "personal"),
      });
    }
    return { iso, date: dates[i], columns };
  });

  const allColumns = dateGroups.flatMap((g) => g.columns);

  function topFor(b: Block) {
    return timeToMinutes(b.scheduled_start!) - GRID_START_MIN;
  }
  function heightFor(b: Block) {
    return Math.max(SNAP, timeToMinutes(b.scheduled_end!) - timeToMinutes(b.scheduled_start!));
  }

  function commit(task: Task, top: number, height: number) {
    const startMin = GRID_START_MIN + top;
    updateTask.mutate({
      id: task.id,
      patch: {
        scheduled_start: minutesToTime(startMin),
        scheduled_end: minutesToTime(startMin + height),
      },
    });
  }

  function onPointerMove(e: PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 3) movedRef.current = true;
    if (d.mode === "move") {
      let top = snap(d.startTop + dy);
      top = Math.max(0, Math.min(top, GRID_HEIGHT - d.height));
      setOverridePos({ blockId: d.blockId, top, height: d.height });
    } else {
      let height = snap(d.startHeight + dy);
      height = Math.max(SNAP, Math.min(height, GRID_HEIGHT - d.top));
      setOverridePos({ blockId: d.blockId, top: d.top, height });
    }
  }

  function onPointerUp() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    const d = dragRef.current;
    if (d) {
      if (!movedRef.current && d.mode === "move") {
        openTask(d.blockId);
      } else if (movedRef.current) {
        const block = allColumns.flatMap((c) => c.blocks).find((b) => b.id === d.blockId);
        const pos = overridePos;
        if (block?.realTask && pos) commit(block.realTask, pos.top, pos.height);
      }
    }
    dragRef.current = null;
    setOverridePos(null);
  }

  function startMove(e: React.PointerEvent, block: Block) {
    if (!block.realTask) return; // 重複展開出來的那次不能拖
    e.stopPropagation();
    movedRef.current = false;
    dragRef.current = { mode: "move", blockId: block.id, startY: e.clientY, startTop: topFor(block), height: heightFor(block) };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }
  function startResize(e: React.PointerEvent, block: Block) {
    if (!block.realTask) return;
    e.stopPropagation();
    movedRef.current = true; // resize 一律視為有操作，不觸發開面板
    dragRef.current = { mode: "resize", blockId: block.id, startY: e.clientY, top: topFor(block), startHeight: heightFor(block) };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function createAt(e: React.MouseEvent<HTMLDivElement>, column: Column) {
    if (e.target !== e.currentTarget) return; // 點到現有色塊，不要在下面建立新任務
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const top = Math.max(0, Math.min(snap(offsetY), GRID_HEIGHT - 60));
    const startMin = GRID_START_MIN + top;
    const areaId = areas?.find((a) => a.type === column.areaType)?.id ?? null;

    createTask
      .mutateAsync({
        title: "新任務",
        area_id: areaId,
        scheduled_date: column.date,
        scheduled_start: minutesToTime(startMin),
        scheduled_end: minutesToTime(startMin + 60),
      })
      .then((task) => openTask(task.id))
      .catch(() => {});
  }

  const hourMarks: number[] = [];
  for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) hourMarks.push(m);

  if (allColumns.length === 0) {
    return <p className="text-sm text-neutral-400">左側篩選都關閉了，沒有東西可以顯示。</p>;
  }

  function renderBlock(b: Block, slot: OverlapSlot) {
    const override = overridePos?.blockId === b.id ? overridePos : null;
    const top = override?.top ?? topFor(b);
    const height = override?.height ?? heightFor(b);
    // 時間重疊的色塊並排顯示（像 Google Calendar），欄與欄之間留一點縫。
    const gapPx = 2;
    const left = `calc(${(slot.col / slot.cols) * 100}% + ${slot.col === 0 ? 4 : gapPx}px)`;
    const width = `calc(${100 / slot.cols}% - ${slot.col === 0 ? 4 + gapPx : gapPx * 2}px)`;

    // 完成的（不管是 Task 本身還是重複的某一次）維持在原本的時間格位置，
    // 只是變淡灰色，不整個消失——這樣才看得出「這時段本來排了什麼」。
    const isCompleted = b.realTask ? b.realTask.status === "completed" : !!b.occurrence?.completed;
    const overdue =
      !isCompleted && b.realTask ? isTaskOverdue(b.realTask) : false;
    const bg = isCompleted ? "#e5e7eb" : b.color;
    const fg = isCompleted ? "#6b7280" : getContrastTextColor(b.color);

    return (
      <div
        key={b.id}
        onPointerDown={(e) => startMove(e, b)}
        onClick={() => {
          if (b.occurrence) setOccurrenceCompleted.mutate({ ...b.occurrence, completed: !b.occurrence.completed });
        }}
        className={`absolute touch-none overflow-hidden rounded px-2 py-1 text-xs select-none ${
          b.realTask ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
        }`}
        style={{
          top,
          height,
          left,
          width,
          background: bg,
          color: fg,
          zIndex: overridePos?.blockId === b.id ? 10 : slot.col + 1,
        }}
      >
        {overdue && (
          <span
            title="已經過期還沒完成"
            className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/90 text-[9px] leading-none font-bold text-amber-600"
          >
            !
          </span>
        )}
        <div className="flex items-center gap-1">
          {b.occurrence && (
            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8a6 6 0 0 1 10.2-4.2M2 8l1.5-2M2 8l2 1.3M14 8a6 6 0 0 1-10.2 4.2M14 8l-1.5 2M14 8l-2-1.3" />
            </svg>
          )}
          <span className="truncate font-semibold">{b.title}</span>
        </div>
        <div className="font-mono text-[10px] opacity-85">
          {b.scheduled_start?.slice(0, 5)}–{b.scheduled_end?.slice(0, 5)}
        </div>

        {b.realTask && (
          <div onPointerDown={(e) => startResize(e, b)} className="absolute inset-x-0 bottom-0 h-2 touch-none cursor-ns-resize" />
        )}
        {b.occurrence && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              cancelOccurrence.mutate(b.occurrence!);
            }}
            className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/15 text-[9px] hover:bg-black/30"
            title="跳過這一次"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  const hasAllDay = allColumns.some((c) => c.blocks.some((b) => b.is_all_day));

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {hasAllDay && (
        <div className="flex border-b border-neutral-200 text-xs">
          <div className="w-12 shrink-0 px-1.5 py-2 text-neutral-400">全天</div>
          {dateGroups.map((g) => (
            <div key={g.iso} className="flex flex-1 border-l border-neutral-200">
              {g.columns.map((col) => (
                <div key={col.key} className="flex flex-1 flex-col gap-1 border-l border-neutral-100 px-1.5 py-1.5 first:border-l-0">
                  {col.blocks
                    .filter((b) => b.is_all_day)
                    .map((b) => {
                      const isCompleted = b.realTask ? b.realTask.status === "completed" : !!b.occurrence?.completed;
                      const overdue =
                        !isCompleted && b.realTask ? isTaskOverdue(b.realTask) : false;
                      return (
                        <button
                          key={b.id}
                          onClick={() =>
                            b.realTask ? openTask(b.id) : setOccurrenceCompleted.mutate({ ...b.occurrence!, completed: !b.occurrence!.completed })
                          }
                          className="relative block w-full truncate rounded px-2 py-1 text-left text-[11px] font-semibold"
                          style={{
                            background: isCompleted ? "#e5e7eb" : b.color,
                            color: isCompleted ? "#6b7280" : getContrastTextColor(b.color),
                          }}
                        >
                          {overdue && (
                            <span
                              title="已經過期還沒完成"
                              className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-white/90 text-[8px] leading-none font-bold text-amber-600"
                            >
                              !
                            </span>
                          )}
                          {b.title}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex border-b border-neutral-200">
        <div className="w-12 shrink-0" />
        {dateGroups.map((g) => (
          <div key={g.iso} className="flex-1 border-l border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-800">
            {dateLabel(g.date)}
          </div>
        ))}
      </div>
      <div className="flex border-b border-neutral-200">
        <div className="w-12 shrink-0" />
        {dateGroups.map((g) => (
          <div key={g.iso} className="flex flex-1 border-l border-neutral-200">
            {g.columns.map((col) => (
              <div key={col.key} className="flex-1 border-l border-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-500 first:border-l-0">
                {col.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex" style={{ height: GRID_HEIGHT }}>
        <div className="relative w-12 shrink-0">
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-neutral-400"
              style={{ top: m - GRID_START_MIN }}
            >
              {minutesToTime(m)}
            </div>
          ))}
        </div>

        {dateGroups.map((g) => (
          <div key={g.iso} className="flex flex-1 border-l border-neutral-200">
            {g.columns.map((col) => (
              <div
                key={col.key}
                onClick={(e) => createAt(e, col)}
                className="relative flex-1 cursor-cell border-l border-neutral-100 first:border-l-0"
                title="點空白處新增任務"
              >
                {hourMarks.map((m) => (
                  <div key={m} className="absolute left-0 right-0 border-t border-neutral-100" style={{ top: m - GRID_START_MIN }} />
                ))}
                {(() => {
                  const timedBlocks = col.blocks.filter((b) => !b.is_all_day);
                  const layout = layoutOverlaps(timedBlocks.map((b) => ({ id: b.id, top: topFor(b), height: heightFor(b) })));
                  return timedBlocks.map((b) => renderBlock(b, layout.get(b.id) ?? { col: 0, cols: 1 }));
                })()}
                {col.reminders.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (r.occurrence) {
                        setReminderOccurrenceCompleted.mutate({ ...r.occurrence, completed: !r.completed });
                      } else {
                        openReminder(r.id);
                      }
                    }}
                    title={`${r.time} ${r.title}${r.completed ? "（已完成）" : ""}`}
                    className="absolute left-0.5 right-0.5 z-20 flex items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                    style={{
                      top: r.top - 9 + i * 15,
                      background: r.completed ? "#e5e7eb" : "white",
                      borderColor: r.completed ? "#d1d5db" : r.color,
                      color: r.completed ? "#9ca3af" : r.color,
                      textDecoration: r.completed ? "line-through" : "none",
                    }}
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2.5a3.2 3.2 0 0 0-3.2 3.2c0 3.7-1.5 4.8-1.5 4.8h9.4s-1.5-1.1-1.5-4.8A3.2 3.2 0 0 0 8 2.5Z" />
                      <path d="M6.6 12.7a1.4 1.4 0 0 0 2.8 0" />
                    </svg>
                    <span className="font-mono">{r.time}</span>
                    <span className="truncate">{r.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
