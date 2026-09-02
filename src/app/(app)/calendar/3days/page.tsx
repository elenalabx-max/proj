"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, format } from "date-fns";
import { MultiDayTimeline } from "@/components/calendar/multi-day-timeline";
import { QuadrantGrid } from "@/components/calendar/quadrant-grid";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { parseISODate, toISODate } from "@/lib/date";

function ThreeDaysContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("date");
  const [referenceDate, setReferenceDate] = useState(() => (initial ? parseISODate(initial) : new Date()));
  const [view, setView] = useState<"timeline" | "quadrant">("timeline");
  const isMobile = useIsMobile();

  // 手機螢幕太窄，3 天 x Work|Personal 至少 6 欄會擠成一團——收成只顯示當天，
  // 左右箭頭一樣是一天一天翻，行為不變。
  const dates = isMobile ? [referenceDate] : [0, 1, 2].map((n) => addDays(referenceDate, n));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setReferenceDate((d) => addDays(d, -1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          ←
        </button>
        <button
          onClick={() => setReferenceDate(new Date())}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
        >
          今天
        </button>
        <button
          onClick={() => setReferenceDate((d) => addDays(d, 1))}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50"
        >
          →
        </button>
        <span className="ml-2 text-sm font-semibold text-neutral-900">
          {isMobile
            ? format(dates[0], "yyyy / MM / dd")
            : `${format(dates[0], "yyyy / MM / dd")} – ${format(dates[dates.length - 1], "MM / dd")}`}
        </span>
        <span className="font-mono text-xs text-neutral-400">{toISODate(referenceDate)}</span>

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

      {view === "timeline" ? (
        <MultiDayTimeline dates={dates} />
      ) : (
        <>
          <p className="text-xs text-neutral-400">四象限只看 {format(dates[0], "M/d")} 這一天的任務。</p>
          <QuadrantGrid date={referenceDate} />
        </>
      )}
    </div>
  );
}

export default function ThreeDaysPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">載入中…</p>}>
      <ThreeDaysContent />
    </Suspense>
  );
}
