"use client";

import { useState } from "react";
import { addMonths, format } from "date-fns";
import { MonthGrid } from "@/components/calendar/month-grid";
import { getMonthGridDates } from "@/lib/date";

export default function MonthPage() {
  const [reference, setReference] = useState(new Date());
  const dates = getMonthGridDates(reference, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setReference((d) => addMonths(d, -1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          ←
        </button>
        <button
          onClick={() => setReference(new Date())}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
        >
          本月
        </button>
        <button
          onClick={() => setReference((d) => addMonths(d, 1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          →
        </button>
        <span className="ml-2 text-sm font-semibold text-neutral-900">{format(reference, "yyyy / MM")}</span>
      </div>

      <MonthGrid reference={reference} dates={dates} />
    </div>
  );
}
