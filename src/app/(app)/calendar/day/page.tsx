"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, format } from "date-fns";
import { DayTimeline } from "@/components/calendar/day-timeline";
import { parseISODate, toISODate } from "@/lib/date";

function DayContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("date");
  const [date, setDate] = useState(() => (initial ? parseISODate(initial) : new Date()));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          ←
        </button>
        <button
          onClick={() => setDate(new Date())}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
        >
          今天
        </button>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          →
        </button>
        <span className="ml-2 text-sm font-semibold text-neutral-900">
          {format(date, "yyyy / MM / dd")}
        </span>
        <span className="font-mono text-xs text-neutral-400">{toISODate(date)}</span>
      </div>

      <DayTimeline date={date} />
    </div>
  );
}

export default function DayPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">載入中…</p>}>
      <DayContent />
    </Suspense>
  );
}
