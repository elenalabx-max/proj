"use client";

import { useRef, useState } from "react";
import { isToday } from "date-fns";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import {
  useArchiveTask,
  useCreateTask,
  useFollowUpsInRange,
  useDelegateDeadlinesInRange,
  useUpdateTask,
  followUpLabel,
  delegateDeadlineLabel,
} from "@/hooks/use-tasks";
import { useTodosInRange } from "@/hooks/use-todos";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { useTaskPanelStore } from "@/stores/task-panel";
import { useTodoPanelStore } from "@/stores/todo-panel";
import { useReminderPanelStore } from "@/stores/reminder-panel";
import { useCancelOccurrence, useRecurringOccurrences, useSetOccurrenceCompleted } from "@/hooks/use-recurrence";
import { useRecurringTodoOccurrences, useSetTodoOccurrenceCompleted } from "@/hooks/use-todo-recurrence";
import { useProjectRemindersInRange } from "@/hooks/use-reminders";
import { useRecurringReminderOccurrences, useSetReminderOccurrenceCompleted } from "@/hooks/use-reminder-recurrence";
import { TodoDotIcon, FollowUpIcon, DelegateDeadlineIcon } from "@/components/ui/glyphs";
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

// 交辦的「我的 Follow-up」跟「對方 Deadline」共用同一種形狀——都是用 Task
// 自己某個時間欄位（follow_up_at／delegate_deadline）畫在時間軸上，跟
// Reminder 呈現方式一致，但點下去是開 Task 面板（不是切換完成，這兩個都
// 沒有獨立的完成狀態，要透過 Review 頁面的動作處理）。
type TaskDateMarker = {
  id: string;
  title: string;
  time: string;
  top: number;
  color: string;
};

type Column = {
  key: string;
  date: string;
  areaType: "work" | "personal";
  label: string;
  blocks: Block[];
  reminders: ReminderMarker[];
  followUps: TaskDateMarker[];
  deadlines: TaskDateMarker[];
};

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
  const { data: followUps } = useFollowUpsInRange(rangeStart, rangeEnd);
  const { data: deadlines } = useDelegateDeadlinesInRange(rangeStart, rangeEnd);
  const { data: occurrences } = useRecurringOccurrences(rangeStart, rangeEnd);
  const { data: todos } = useTodosInRange(rangeStart, rangeEnd);
  const { data: todoOccurrences } = useRecurringTodoOccurrences(rangeStart, rangeEnd);
  const { data: projectReminders } = useProjectRemindersInRange(rangeStart, rangeEnd);
  const { data: reminderOccurrences } = useRecurringReminderOccurrences(rangeStart, rangeEnd);
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const archiveTask = useArchiveTask();
  const openTask = useTaskPanelStore((s) => s.open);
  const setOccurrenceCompleted = useSetOccurrenceCompleted();
  const cancelOccurrence = useCancelOccurrence();
  const openTodo = useTodoPanelStore((s) => s.open);
  const setTodoOccurrenceCompleted = useSetTodoOccurrenceCompleted();
  const openReminder = useReminderPanelStore((s) => s.open);
  const setReminderOccurrenceCompleted = useSetReminderOccurrenceCompleted();

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  // 選 hiddenProjectIds 本身而不是 isProjectVisible 這個函式參照，見 area-project-filter.tsx 的註解。
  const hiddenProjectIds = useCalendarFilterStore((s) => s.hiddenProjectIds);
  const isProjectVisible = (id: string) => !hiddenProjectIds.has(id);

  const [overridePos, setOverridePos] = useState<{ blockId: string; top: number; height: number } | null>(null);
  // onPointerMove/onPointerUp 是透過 window.addEventListener 掛上去的，掛上當下
  // 那個 render 的 closure 會一直用到 removeEventListener 為止，中途 setOverridePos
  // 觸發的重新 render 不會讓已經掛上的 listener 換成新的 closure——所以 onPointerUp
  // 讀 overridePos 這個 state 永遠會拿到「剛開始拖曳、還沒動過」那個舊值（null）。
  // 用 ref 額外存一份最新值，onPointerUp 才讀得到真正拖曳完的位置。
  const overridePosRef = useRef<{ blockId: string; top: number; height: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  // 點空白處新增的 Task 常常是手滑點到，先不開面板，改跳一個幾秒內可以直接
  // 刪掉的提示，不用點空白就多一個「新任務」還要另外找面板刪除。
  const [justCreated, setJustCreated] = useState<{ id: string; title: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Follow-up／對方 Deadline 用 area_id/project_id 直接算顏色（不用像 Reminder
  // 繞道 Project），Task 本身就有這兩個欄位。兩種都是同樣的「Task 某個時間
  // 欄位」畫法，只差抓哪個欄位、標籤用哪個。
  const followUpMarkers: (TaskDateMarker & { date: string; areaType: "work" | "personal" })[] = [];
  for (const t of followUps ?? []) {
    const areaType = areaTypeOf(t.area_id);
    if (areaType !== "work" && areaType !== "personal") continue;
    if (!isVisible(areaType, t.project_id)) continue;

    const d = new Date(t.follow_up_at!);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!isoList.includes(localIso)) continue;
    const minutesOfDay = d.getHours() * 60 + d.getMinutes();
    if (minutesOfDay < GRID_START_MIN || minutesOfDay > GRID_END_MIN) continue;

    followUpMarkers.push({
      id: t.id,
      title: followUpLabel(t),
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      top: minutesOfDay - GRID_START_MIN,
      color: colorFor(areaType, t.project_id),
      date: localIso,
      areaType,
    });
  }

  const deadlineMarkers: (TaskDateMarker & { date: string; areaType: "work" | "personal" })[] = [];
  for (const t of deadlines ?? []) {
    const areaType = areaTypeOf(t.area_id);
    if (areaType !== "work" && areaType !== "personal") continue;
    if (!isVisible(areaType, t.project_id)) continue;

    const d = new Date(t.delegate_deadline!);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!isoList.includes(localIso)) continue;
    const minutesOfDay = d.getHours() * 60 + d.getMinutes();
    if (minutesOfDay < GRID_START_MIN || minutesOfDay > GRID_END_MIN) continue;

    deadlineMarkers.push({
      id: t.id,
      title: delegateDeadlineLabel(t),
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      top: minutesOfDay - GRID_START_MIN,
      color: colorFor(areaType, t.project_id),
      date: localIso,
      areaType,
    });
  }

  // Todo 沒有時間概念，不畫進格子裡，另外用一整排「Todo」列顯示——跟全天列
  // 平行，不分 Work/Personal 兩欄（Todo 本身有 area_id，用來算要不要顯示）。
  type TodoMarker = {
    id: string;
    title: string;
    color: string;
    completed: boolean;
    date: string;
    onToggle: () => void;
    // 只有重複展開出來的那次才有值——這種沒有自己的列可以開，要編輯標題/
    // Repeat 設定得改開 master Todo 的面板。
    editId?: string;
  };
  const todoMarkers: TodoMarker[] = [];
  for (const t of todos ?? []) {
    if (t.recurrence_rule_id) continue; // 這種改由下面的 occurrences 展開，避免重複顯示
    if (!t.date || !isoList.includes(t.date)) continue;
    const areaType = areaTypeOf(t.area_id);
    if (!isVisible(areaType, t.project_id)) continue;
    todoMarkers.push({
      id: t.id,
      title: t.title,
      color: colorFor(areaType, t.project_id),
      completed: !!t.completed_at,
      date: t.date,
      // 有自己的 row 就開面板（跟全天 Task／Reminder 一致），重複展開的那次
      // 沒有自己的 row，點一下直接切換完成。
      onToggle: () => openTodo(t.id),
    });
  }
  for (const o of todoOccurrences ?? []) {
    if (!isoList.includes(o.date)) continue;
    const areaType = areaTypeOf(o.masterTodo.area_id);
    if (!isVisible(areaType, o.masterTodo.project_id)) continue;
    todoMarkers.push({
      id: o.id,
      title: o.title,
      color: colorFor(areaType, o.masterTodo.project_id),
      completed: o.completed,
      date: o.date,
      onToggle: () =>
        setTodoOccurrenceCompleted.mutate({
          ruleId: o.masterTodo.recurrence_rule_id!,
          todoId: o.masterTodo.id,
          date: o.date,
          completed: !o.completed,
        }),
      editId: o.masterTodo.id,
    });
  }
  const hasTodos = todoMarkers.length > 0;

  const dateGroups = isoList.map((iso, i) => {
    const dayBlocks = blocks.filter((b) => b.date === iso);
    const dayReminders = reminderMarkers.filter((r) => r.date === iso);
    const dayFollowUps = followUpMarkers.filter((f) => f.date === iso);
    const dayDeadlines = deadlineMarkers.filter((f) => f.date === iso);
    const columns: Column[] = [];
    if (showWork) {
      columns.push({
        key: `${iso}:work`,
        date: iso,
        areaType: "work",
        label: "工作",
        blocks: dayBlocks.filter((b) => !isPersonal(b)),
        reminders: dayReminders.filter((r) => r.areaType === "work"),
        followUps: dayFollowUps.filter((f) => f.areaType === "work"),
        deadlines: dayDeadlines.filter((f) => f.areaType === "work"),
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
        followUps: dayFollowUps.filter((f) => f.areaType === "personal"),
        deadlines: dayDeadlines.filter((f) => f.areaType === "personal"),
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
        // height 本身就是這個色塊目前的分鐘數，拖曳/縮放完直接拿來當預計工時，
        // 不用另外手動填。
        estimated_minutes: height,
      },
    });
  }

  function applyOverridePos(pos: { blockId: string; top: number; height: number } | null) {
    overridePosRef.current = pos;
    setOverridePos(pos);
  }

  function onPointerMove(e: PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 3) movedRef.current = true;
    if (d.mode === "move") {
      let top = snap(d.startTop + dy);
      top = Math.max(0, Math.min(top, GRID_HEIGHT - d.height));
      applyOverridePos({ blockId: d.blockId, top, height: d.height });
    } else {
      let height = snap(d.startHeight + dy);
      height = Math.max(SNAP, Math.min(height, GRID_HEIGHT - d.top));
      applyOverridePos({ blockId: d.blockId, top: d.top, height });
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
        const pos = overridePosRef.current;
        if (block?.realTask && pos) commit(block.realTask, pos.top, pos.height);
      }
    }
    dragRef.current = null;
    applyOverridePos(null);
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
        estimated_minutes: 60,
      })
      .then((task) => {
        // 不直接開面板——手滑點到空白處很常見，開面板反而更麻煩。改成跳個
        // 幾秒內可以直接刪掉的提示，真的要編輯的話點提示或直接點色塊都行。
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
        setJustCreated({ id: task.id, title: task.title });
        undoTimerRef.current = setTimeout(() => setJustCreated(null), 6000);
      })
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
    // 只是變淡灰色，不整個消失——這樣才看得出「這時段本來排了什麼」。已經交辦
    // 出去的（status='waiting'）也算同一種：對我來說這件事現在不用我做了，
    // 一樣用灰色表示「不用再花注意力在這上面」。
    const isCompleted = b.realTask
      ? b.realTask.status === "completed" || b.realTask.status === "waiting"
      : !!b.occurrence?.completed;
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
          <span className="min-w-0 truncate font-semibold">{b.title}</span>
          {/* 編輯這個重複系列的入口放在名稱後面，不要疊在文字上——點色塊本身
              還是切換這一次完成/取消完成。 */}
          {b.occurrence && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openTask(b.occurrence!.taskId);
              }}
              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-black/15 text-[9px] hover:bg-black/30"
              title="編輯這個重複系列"
            >
              <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2.5 13.5 5 5.5 13H3v-2.5Z" />
              </svg>
            </button>
          )}
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
    <>
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
                      const isCompleted = b.realTask
                        ? b.realTask.status === "completed" || b.realTask.status === "waiting"
                        : !!b.occurrence?.completed;
                      const overdue =
                        !isCompleted && b.realTask ? isTaskOverdue(b.realTask) : false;
                      return (
                        // 編輯入口跟色塊本身分成兩個 sibling 而不是疊在文字上——
                        // 色塊寬度不固定，疊左上角常常剛好蓋到短標題的字。
                        <div key={b.id} className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              b.realTask ? openTask(b.id) : setOccurrenceCompleted.mutate({ ...b.occurrence!, completed: !b.occurrence!.completed })
                            }
                            className="relative block min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-[11px] font-semibold"
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
                          {b.occurrence && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openTask(b.occurrence!.taskId);
                              }}
                              className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-black/10 text-[8px] hover:bg-black/20"
                              title="編輯這個重複系列"
                            >
                              <svg viewBox="0 0 16 16" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 2.5 13.5 5 5.5 13H3v-2.5Z" />
                              </svg>
                            </button>
                          )}
                        </div>
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
          <div
            key={g.iso}
            className={`flex-1 border-l border-neutral-200 px-2.5 py-1.5 text-xs font-semibold ${
              isToday(g.date) ? "bg-neutral-900/5 text-neutral-900" : "text-neutral-800"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {dateLabel(g.date)}
              {isToday(g.date) && (
                <span className="rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">今天</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {hasTodos && (
        <div className="flex border-b border-neutral-200 text-xs">
          <div className="w-12 shrink-0 px-1.5 py-2 text-neutral-400">Todo</div>
          {dateGroups.map((g) => (
            <div key={g.iso} className="flex flex-1 flex-wrap items-center gap-1 border-l border-neutral-200 px-1.5 py-1.5">
              {todoMarkers
                .filter((t) => t.date === g.iso)
                .map((t) => (
                  <span key={t.id} className="relative inline-flex max-w-full">
                    <button
                      onClick={t.onToggle}
                      className="flex max-w-full items-center gap-1 rounded-full border py-0.5 pr-2 pl-2 font-medium"
                      style={{
                        borderColor: t.completed ? "#d1d5db" : t.color,
                        color: t.completed ? "#9ca3af" : t.color,
                        textDecoration: t.completed ? "line-through" : "none",
                        paddingRight: t.editId ? 18 : undefined,
                      }}
                    >
                      <TodoDotIcon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </button>
                    {t.editId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTodo(t.editId!);
                        }}
                        className="absolute top-1/2 right-1 flex h-3 w-3 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-[8px] hover:bg-black/20"
                        title="編輯這個重複系列"
                      >
                        <svg viewBox="0 0 16 16" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 2.5 13.5 5 5.5 13H3v-2.5Z" />
                        </svg>
                      </button>
                    )}
                  </span>
                ))}
            </div>
          ))}
        </div>
      )}

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
                  <div
                    key={r.id}
                    className="absolute left-0.5 right-0.5 z-20 flex items-center gap-1"
                    style={{ top: r.top - 9 + i * 15 }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (r.occurrence) {
                          setReminderOccurrenceCompleted.mutate({ ...r.occurrence, completed: !r.completed });
                        } else {
                          openReminder(r.id);
                        }
                      }}
                      title={`${r.time} ${r.title}${r.completed ? "（已完成）" : ""}`}
                      className="flex min-w-0 flex-1 items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                      style={{
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
                      <span className="min-w-0 truncate">{r.title}</span>
                    </button>
                    {r.occurrence && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReminder(r.occurrence!.reminderId);
                        }}
                        className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-black/10 text-[8px] hover:bg-black/20"
                        title="編輯這個重複系列"
                      >
                        <svg viewBox="0 0 16 16" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 2.5 13.5 5 5.5 13H3v-2.5Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {col.followUps.map((f, i) => (
                  <button
                    key={`followup:${f.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openTask(f.id);
                    }}
                    title={`${f.time} ${f.title}（我的 Follow-up）`}
                    className="absolute left-0.5 right-0.5 z-20 flex items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                    style={{
                      top: f.top - 9 + (col.reminders.length + i) * 15,
                      background: "white",
                      borderColor: f.color,
                      color: f.color,
                    }}
                  >
                    <FollowUpIcon className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{f.time}</span>
                    <span className="truncate">{f.title}</span>
                  </button>
                ))}
                {col.deadlines.map((d, i) => (
                  <button
                    key={`deadline:${d.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openTask(d.id);
                    }}
                    title={`${d.time} ${d.title}（對方 Deadline）`}
                    className="absolute left-0.5 right-0.5 z-20 flex items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                    style={{
                      top: d.top - 9 + (col.reminders.length + col.followUps.length + i) * 15,
                      background: "white",
                      borderColor: d.color,
                      color: d.color,
                    }}
                  >
                    <DelegateDeadlineIcon className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{d.time}</span>
                    <span className="truncate">{d.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>

    {justCreated && (
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm text-white shadow-lg">
        <button
          onClick={() => {
            openTask(justCreated.id);
            setJustCreated(null);
          }}
          className="hover:underline"
        >
          已新增「{justCreated.title}」，點這裡編輯
        </button>
        <button
          onClick={() => {
            archiveTask.mutate(justCreated.id);
            setJustCreated(null);
          }}
          className="shrink-0 font-semibold text-red-300 hover:text-red-200"
        >
          刪除
        </button>
      </div>
    )}
    </>
  );
}
