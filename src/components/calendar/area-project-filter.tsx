"use client";

import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useCalendarFilterStore } from "@/stores/calendar-filter";

export function AreaProjectFilter() {
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();

  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const togglePersonal = useCalendarFilterStore((s) => s.togglePersonal);
  const toggleWork = useCalendarFilterStore((s) => s.toggleWork);
  const toggleProject = useCalendarFilterStore((s) => s.toggleProject);
  const isProjectVisible = useCalendarFilterStore((s) => s.isProjectVisible);

  const workProjects = (projects ?? []).filter(
    (p) => areas?.find((a) => a.id === p.area_id)?.type === "work",
  );

  return (
    <div className="w-44 shrink-0 space-y-3 text-sm">
      <label className="flex items-center gap-2 font-medium text-neutral-800">
        <input type="checkbox" checked={showPersonal} onChange={togglePersonal} />
        個人
      </label>

      <div>
        <label className="flex items-center gap-2 font-medium text-neutral-800">
          <input type="checkbox" checked={showWork} onChange={toggleWork} />
          工作
        </label>
        {showWork && (
          <div className="mt-1.5 ml-5 space-y-1.5">
            {workProjects.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-neutral-600">
                <input
                  type="checkbox"
                  checked={isProjectVisible(p.id)}
                  onChange={() => toggleProject(p.id)}
                />
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="truncate">{p.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
