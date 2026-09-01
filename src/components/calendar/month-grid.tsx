"use client";

import { useRouter } from "next/navigation";
import { isSameMonth, isToday } from "date-fns";
import { useTasksInRange } from "@/hooks/use-calendar-tasks";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { resolveTaskColor } from "@/lib/colors";
import { toISODate, weekdayLabels } from "@/lib/date";
import type { Task } from "@/lib/types";

const MAX_VISIBLE_PER_DAY = 3;

export function MonthGrid({ reference, dates }: { reference: Date; dates: Date[] }) {
  const router = useRouter();
  const start = toISODate(dates[0]);
  const end = toISODate(dates[dates.length - 1]);
  const { data: tasks } = useTasksInRange(start, end);
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();

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
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
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
          const dayTasks = visible.filter((t) => t.scheduled_date === iso);
          const shown = dayTasks.slice(0, MAX_VISIBLE_PER_DAY);
          const extra = dayTasks.length - shown.length;
          const inMonth = isSameMonth(date, reference);

          return (
            <button
              key={iso}
              onClick={() => router.push(`/calendar/3days?date=${iso}`)}
              className={`min-h-[92px] border-b border-r border-neutral-100 p-1.5 text-left align-top hover:bg-neutral-50 ${
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
                {shown.map((t) => (
                  <div key={t.id} className="flex items-center gap-1 truncate text-[10px] text-neutral-600">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorOf(t) }} />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {extra > 0 && <div className="text-[10px] text-neutral-400">+{extra} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
