"use client";

import { useState } from "react";
import { addDays, addWeeks, format } from "date-fns";
import { WeekGrid } from "@/components/calendar/week-grid";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getWeekDates } from "@/lib/date";

export default function WeekPage() {
  const [reference, setReference] = useState(new Date());
  const isMobile = useIsMobile();
  const weekDates = getWeekDates(reference, 1);
  // 手機上 7 欄擠不下，收成只顯示 reference 那一天；左右箭頭改成一天一天翻
  // 而不是一週一週翻，這樣才能實際逛過一整週。
  const dates = isMobile ? [reference] : weekDates;

  function goPrev() {
    setReference((d) => (isMobile ? addDays(d, -1) : addWeeks(d, -1)));
  }
  function goNext() {
    setReference((d) => (isMobile ? addDays(d, 1) : addWeeks(d, 1)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={goPrev} className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50">
          ←
        </button>
        <button
          onClick={() => setReference(new Date())}
          className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm hover:bg-neutral-50"
        >
          {isMobile ? "今天" : "本週"}
        </button>
        <button onClick={goNext} className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-50">
          →
        </button>
        <span className="ml-2 text-sm font-semibold text-neutral-900">
          {isMobile ? format(reference, "yyyy/MM/dd") : `${format(weekDates[0], "yyyy/MM/dd")} – ${format(weekDates[6], "MM/dd")}`}
        </span>
      </div>

      <WeekGrid dates={dates} />
    </div>
  );
}
