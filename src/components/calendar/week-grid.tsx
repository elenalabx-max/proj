"use client";

import { isToday } from "date-fns";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { useTaskPanelStore } from "@/stores/task-panel";
import { getContrastTextColor, resolveTaskColor } from "@/lib/colors";
import { toISODate, weekdayLabels } from "@/lib/date";
import type { Task } from "@/lib/types";

// Week 目前是簡化的每日清單（依時間排序），不含 Day 那種可拖曳/縮放的時間格。
// 之後如果需要跨日拖曳，再把這裡換成跟 Day 一樣的時間格引擎。
export function WeekGrid({ dates }: { dates: Date[] }) {
  const start = toISODate(dates[0]);
  const end = toISODate(dates[dates.length - 1]);
  const { data: tasks } = useTasksInRange(start, end);
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();
  const openTask = useTaskPanelStore((s) => s.open);

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const hiddenProjectIds = useCalendarFilterStore((s) => s.hiddenProjectIds);
  const isProjectVisible = (id: string) => !hiddenProjectIds.has(id);

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

  const labels = weekdayLabels(1);

  return (
    <div className="grid grid-cols-7 gap-2">
      {dates.map((date, i) => {
        const iso = toISODate(date);
        const dayTasks = visible
          .filter((t) => t.scheduled_date === iso)
          .sort((a, b) => {
            if (a.is_all_day !== b.is_all_day) return a.is_all_day ? -1 : 1;
            return (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? "");
          });

        return (
          <div key={iso} className="min-h-[140px] rounded-lg border border-neutral-200 bg-white p-2">
            <div className={`mb-1.5 text-xs font-semibold ${isToday(date) ? "text-neutral-900" : "text-neutral-500"}`}>
              {labels[i]} <span className="font-mono">{date.getDate()}</span>
            </div>
            <div className="space-y-1">
              {dayTasks.map((t) => {
                const color = colorOf(t);
                return (
                  <button
                    key={t.id}
                    onClick={() => openTask(t.id)}
                    className="block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium"
                    style={{ background: color, color: getContrastTextColor(color) }}
                  >
                    {!t.is_all_day && t.scheduled_start && (
                      <span className="font-mono opacity-85">{t.scheduled_start.slice(0, 5)} </span>
                    )}
                    {t.title}
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
