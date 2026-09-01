"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, format } from "date-fns";
import { DayTimeline } from "@/components/calendar/day-timeline";
import { QuadrantGrid } from "@/components/calendar/quadrant-grid";
import { parseISODate, toISODate } from "@/lib/date";

function DayContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("date");
  const [date, setDate] = useState(() => (initial ? parseISODate(initial) : new Date()));
  const [view, setView] = useState<"timeline" | "quadrant">("timeline");

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

        <div className="ml-auto flex gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
          {(["timeline", "quadrant"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                view === v ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {v === "timeline" ? "時間軸" : "四象限"}
            </button>
          ))}
        </div>
      </div>

      {view === "timeline" ? <DayTimeline date={date} /> : <QuadrantGrid date={date} />}
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
