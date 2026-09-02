"use client";

import { useCalendarFilterStore } from "@/stores/calendar-filter";
import { EyeToggle } from "@/components/ui/eye-toggle";

export function AreaProjectFilter() {
  const showPersonal = useCalendarFilterStore((s) => s.showPersonal);
  const showWork = useCalendarFilterStore((s) => s.showWork);
  const togglePersonal = useCalendarFilterStore((s) => s.togglePersonal);
  const toggleWork = useCalendarFilterStore((s) => s.toggleWork);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
      <EyeToggle checked={showPersonal} onChange={togglePersonal} className="font-medium text-neutral-800" label="個人" />
      <div className="h-4 w-px bg-neutral-200" />
      <EyeToggle checked={showWork} onChange={toggleWork} className="font-medium text-neutral-800" label="工作" />
    </div>
  );
}
