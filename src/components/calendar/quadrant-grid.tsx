"use client";

import { useRef } from "react";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useUpdateTask } from "@/hooks/use-tasks";
import { useTaskColorResolver } from "@/hooks/use-task-color";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { useTaskPanelStore } from "@/stores/task-panel";
import { toISODate } from "@/lib/date";
import type { Task } from "@/lib/types";

const QUADRANTS = [
  { key: "iu", important: true, urgent: true, label: "重要且緊急", color: "#e03131", icon: "M9 1.5 3 9h4l-1 5.5L13 7H9l1-5.5Z" },
  { key: "inu", important: true, urgent: false, label: "重要且不緊急", color: "#e8a30c", icon: "M8 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM8 5.5v3l2 1.5" },
  { key: "niu", important: false, urgent: true, label: "不重要且緊急", color: "#1c7ed6", icon: "M3 8h9M8 4l4 4-4 4" },
  { key: "ninu", important: false, urgent: false, label: "不重要且不緊急", color: "#6b7280", icon: "M2 3.5h12v3H2zM3 6.5V12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6.5M6.5 9h3" },
] as const;

// 四象限是 Day View 的另一種呈現方式（同一天的資料），只是不再分 Work/Personal 兩欄，
// 改成用 important/urgent 分。拖到別的象限會直接改這兩個欄位。
export function QuadrantGrid({ date }: { date: Date }) {
  const iso = toISODate(date);
  const { data: tasks } = useTasksInRange(iso, iso);
  const { areaTypeOf, colorOf, projectOf } = useTaskColorResolver();
  const updateTask = useUpdateTask();
  const openTask = useTaskPanelStore((s) => s.open);

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const isProjectVisible = useCalendarFilterStore((s) => s.isProjectVisible);

  const dragTaskIdRef = useRef<string | null>(null);

  const visible = (tasks ?? []).filter((t) => {
    const type = areaTypeOf(t);
    if (type === "personal") return showPersonal;
    if (type === "work") return showWork && (!t.project_id || isProjectVisible(t.project_id));
    return showPersonal || showWork;
  });

  function tasksFor(important: boolean, urgent: boolean) {
    return visible.filter((t) => t.important === important && t.urgent === urgent);
  }

  function handleDrop(important: boolean, urgent: boolean) {
    const id = dragTaskIdRef.current;
    dragTaskIdRef.current = null;
    if (!id) return;
    updateTask.mutate({ id, patch: { important, urgent } });
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
            {tasksFor(q.important, q.urgent).map((t) => (
              <QuadrantCard key={t.id} task={t} color={colorOf(t)} areaType={areaTypeOf(t)} projectName={projectOf(t)?.name ?? null} dragTaskIdRef={dragTaskIdRef} onOpen={() => openTask(t.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuadrantCard({
  task,
  color,
  areaType,
  projectName,
  dragTaskIdRef,
  onOpen,
}: {
  task: Task;
  color: string;
  areaType: "personal" | "work" | null;
  projectName: string | null;
  dragTaskIdRef: React.MutableRefObject<string | null>;
  onOpen: () => void;
}) {
  const moved = useRef(false);

  return (
    <button
      draggable
      onDragStart={() => {
        dragTaskIdRef.current = task.id;
        moved.current = true;
      }}
      onClick={() => {
        if (!moved.current) onOpen();
      }}
      onPointerDown={() => {
        moved.current = false;
      }}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-neutral-50"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1">
        <div className="truncate font-medium text-neutral-900">{task.title}</div>
        <div className="truncate text-[10px] text-neutral-400">
          {areaType === "personal" ? "個人" : "工作"}
          {projectName ? ` · ${projectName}` : ""}
        </div>
      </span>
    </button>
  );
}
