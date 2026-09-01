"use client";

import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { EyeToggle } from "@/components/ui/eye-toggle";

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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
      <EyeToggle checked={showPersonal} onChange={togglePersonal} className="font-medium text-neutral-800" label="個人" />

      <div className="h-4 w-px bg-neutral-200" />

      <EyeToggle checked={showWork} onChange={toggleWork} className="font-medium text-neutral-800" label="工作" />

      {showWork && workProjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {workProjects.map((p) => (
            <EyeToggle
              key={p.id}
              checked={isProjectVisible(p.id)}
              onChange={() => toggleProject(p.id)}
              className="text-neutral-600"
              label={
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                  <span className="truncate">{p.name}</span>
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
