"use client";

import { useRef, useState } from "react";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useCreateTask, useUpdateTask } from "@/hooks/use-tasks";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { useTaskPanelStore } from "@/stores/task-panel";
import { getContrastTextColor, resolveTaskColor } from "@/lib/colors";
import { minutesToTime, timeToMinutes, toISODate } from "@/lib/date";
import type { Task } from "@/lib/types";

const GRID_START_MIN = 360; // 06:00
const GRID_END_MIN = 1380; // 23:00
const GRID_HEIGHT = GRID_END_MIN - GRID_START_MIN;
const SNAP = 15;

function snap(v: number) {
  return Math.round(v / SNAP) * SNAP;
}

type DragState =
  | { mode: "move"; taskId: string; startY: number; startTop: number; height: number }
  | { mode: "resize"; taskId: string; startY: number; top: number; startHeight: number };

export function DayTimeline({ date }: { date: Date }) {
  const iso = toISODate(date);
  const { data: tasks } = useTasksInRange(iso, iso);
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();
  const updateTask = useUpdateTask();
  const createTask = useCreateTask();
  const openTask = useTaskPanelStore((s) => s.open);

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const isProjectVisible = useCalendarFilterStore((s) => s.isProjectVisible);

  const [overridePos, setOverridePos] = useState<{ taskId: string; top: number; height: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);

  function areaTypeOf(task: Task) {
    return areas?.find((a) => a.id === task.area_id)?.type ?? null;
  }
  function colorOf(task: Task) {
    const project = projects?.find((p) => p.id === task.project_id);
    return resolveTaskColor({
      areaType: areaTypeOf(task),
      projectColor: project?.color,
      personalDefaultColor: settings?.personal_default_color ?? "#9a86ac",
      workFallbackColor: settings?.work_fallback_color ?? "#5b7f9a",
    });
  }

  const visible = (tasks ?? []).filter((t) => {
    const type = areaTypeOf(t);
    if (type === "personal") return showPersonal;
    if (type === "work") return showWork && (!t.project_id || isProjectVisible(t.project_id));
    return showPersonal || showWork;
  });

  const allDay = visible.filter((t) => t.is_all_day);
  const timed = visible.filter((t) => !t.is_all_day && t.scheduled_start && t.scheduled_end);

  const isPersonal = (t: Task) => areaTypeOf(t) === "personal";
  const workAllDay = allDay.filter((t) => !isPersonal(t));
  const personalAllDay = allDay.filter(isPersonal);
  const workTasks = timed.filter((t) => !isPersonal(t));
  const personalTasks = timed.filter(isPersonal);

  const lanes: { key: string; label: string; tasks: Task[] }[] = [];
  if (showWork) lanes.push({ key: "work", label: "工作 Work", tasks: workTasks });
  if (showPersonal) lanes.push({ key: "personal", label: "個人 Personal", tasks: personalTasks });

  function topFor(t: Task) {
    return timeToMinutes(t.scheduled_start!) - GRID_START_MIN;
  }
  function heightFor(t: Task) {
    return Math.max(SNAP, timeToMinutes(t.scheduled_end!) - timeToMinutes(t.scheduled_start!));
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
      setOverridePos({ taskId: d.taskId, top, height: d.height });
    } else {
      let height = snap(d.startHeight + dy);
      height = Math.max(SNAP, Math.min(height, GRID_HEIGHT - d.top));
      setOverridePos({ taskId: d.taskId, top: d.top, height });
    }
  }

  function onPointerUp() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    const d = dragRef.current;
    if (d) {
      if (!movedRef.current && d.mode === "move") {
        openTask(d.taskId);
      } else if (movedRef.current) {
        const task = [...workTasks, ...personalTasks].find((t) => t.id === d.taskId);
        const pos = overridePos;
        if (task && pos) commit(task, pos.top, pos.height);
      }
    }
    dragRef.current = null;
    setOverridePos(null);
  }

  function startMove(e: React.PointerEvent, task: Task) {
    e.stopPropagation();
    movedRef.current = false;
    dragRef.current = { mode: "move", taskId: task.id, startY: e.clientY, startTop: topFor(task), height: heightFor(task) };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }
  function startResize(e: React.PointerEvent, task: Task) {
    e.stopPropagation();
    movedRef.current = true; // resize 一律視為有操作，不觸發開面板
    dragRef.current = { mode: "resize", taskId: task.id, startY: e.clientY, top: topFor(task), startHeight: heightFor(task) };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function createAt(e: React.MouseEvent<HTMLDivElement>, laneKey: "work" | "personal") {
    if (e.target !== e.currentTarget) return; // 點到現有色塊，不要在下面建立新任務
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const top = Math.max(0, Math.min(snap(offsetY), GRID_HEIGHT - 60));
    const startMin = GRID_START_MIN + top;
    const areaId = areas?.find((a) => a.type === laneKey)?.id ?? null;

    createTask
      .mutateAsync({
        title: "新任務",
        area_id: areaId,
        scheduled_date: iso,
        scheduled_start: minutesToTime(startMin),
        scheduled_end: minutesToTime(startMin + 60),
      })
      .then((task) => openTask(task.id))
      .catch(() => {});
  }

  const hourMarks: number[] = [];
  for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 60) hourMarks.push(m);

  if (lanes.length === 0) {
    return <p className="text-sm text-neutral-400">左側篩選都關閉了，沒有東西可以顯示。</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {(workAllDay.length > 0 || personalAllDay.length > 0) && (
        <div className="grid border-b border-neutral-200 text-xs" style={{ gridTemplateColumns: `48px repeat(${lanes.length}, 1fr)` }}>
          <div className="px-1.5 py-2 text-neutral-400">全天</div>
          {lanes.map((lane) => (
            <div key={lane.key} className="flex flex-wrap gap-1.5 border-l border-neutral-200 px-2 py-1.5">
              {(lane.key === "work" ? workAllDay : personalAllDay).map((t) => (
                <button
                  key={t.id}
                  onClick={() => openTask(t.id)}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: colorOf(t), color: getContrastTextColor(colorOf(t)) }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="grid border-b border-neutral-200" style={{ gridTemplateColumns: `48px repeat(${lanes.length}, 1fr)` }}>
        <div />
        {lanes.map((lane) => (
          <div key={lane.key} className="border-l border-neutral-200 px-2.5 py-2 text-xs font-semibold text-neutral-700">
            {lane.label}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: `48px repeat(${lanes.length}, 1fr)`, height: GRID_HEIGHT }}>
        <div className="relative">
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

        {lanes.map((lane) => (
          <div
            key={lane.key}
            onClick={(e) => createAt(e, lane.key as "work" | "personal")}
            className="relative cursor-cell border-l border-neutral-200"
            title="點空白處新增任務"
          >
            {hourMarks.map((m) => (
              <div key={m} className="absolute left-0 right-0 border-t border-neutral-100" style={{ top: m - GRID_START_MIN }} />
            ))}

            {lane.tasks.map((t) => {
              const override = overridePos?.taskId === t.id ? overridePos : null;
              const top = override?.top ?? topFor(t);
              const height = override?.height ?? heightFor(t);
              const color = colorOf(t);
              return (
                <div
                  key={t.id}
                  onPointerDown={(e) => startMove(e, t)}
                  className="absolute left-1 right-1 cursor-grab select-none overflow-hidden rounded px-2 py-1 text-xs active:cursor-grabbing"
                  style={{ top, height, background: color, color: getContrastTextColor(color) }}
                >
                  <div className="truncate font-semibold">{t.title}</div>
                  <div className="font-mono text-[10px] opacity-85">
                    {t.scheduled_start?.slice(0, 5)}–{t.scheduled_end?.slice(0, 5)}
                  </div>
                  <div
                    onPointerDown={(e) => startResize(e, t)}
                    className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
