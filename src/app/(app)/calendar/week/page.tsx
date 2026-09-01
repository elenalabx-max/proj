"use client";

import { useState } from "react";
import { addWeeks, format } from "date-fns";
import { WeekGrid } from "@/components/calendar/week-grid";
import { getWeekDates } from "@/lib/date";

export default function WeekPage() {
  const [reference, setReference] = useState(new Date());
  const dates = getWeekDates(reference, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setReference((d) => addWeeks(d, -1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          ←
        </button>
        <button
          onClick={() => setReference(new Date())}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
        >
          本週
        </button>
        <button
          onClick={() => setReference((d) => addWeeks(d, 1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          →
        </button>
        <span className="ml-2 text-sm font-semibold text-neutral-900">
          {format(dates[0], "yyyy/MM/dd")} – {format(dates[6], "MM/dd")}
        </span>
      </div>

      <WeekGrid dates={dates} />
    </div>
  );
}
