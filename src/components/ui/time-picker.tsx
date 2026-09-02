"use client";

import { useEffect, useRef, useState } from "react";

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function formatDisplay(value: string) {
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const period = h < 12 ? "上午" : "下午";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${String(h12).padStart(2, "0")}:${mStr}`;
}

// 讓使用者可以直接打字("18:30" / "630" / "6:30pm" / "下午6:30" 都吃)，
// 不用硬點原生 time input 那個小小的時/分/上下午三段。
function parseTimeInput(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  const pmHint = /下午|pm/.test(s) ? "pm" : /上午|am/.test(s) ? "am" : null;
  const digits = s.replace(/[^0-9:]/g, "");
  if (!digits) return null;

  let h: number;
  let m: number;
  if (digits.includes(":")) {
    const [hs, ms] = digits.split(":");
    h = Number(hs);
    m = Number(ms || "0");
  } else if (digits.length <= 2) {
    h = Number(digits);
    m = 0;
  } else if (digits.length === 3) {
    h = Number(digits.slice(0, 1));
    m = Number(digits.slice(1));
  } else {
    h = Number(digits.slice(0, digits.length - 2));
    m = Number(digits.slice(-2));
  }
  if (Number.isNaN(h) || Number.isNaN(m) || m > 59) return null;

  if (pmHint === "pm" && h < 12) h += 12;
  if (pmHint === "am" && h === 12) h = 0;
  if (h > 23) return null;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// 跟 Notion / Google 行事曆的時間輸入一樣：打字直接輸入，或點開下拉選單挑一個
// 15 分鐘刻度的時間——不用原生 <input type="time"> 那種要精準點中時/分/上下午
// 小分段的介面。
export function TimePicker({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // null = 還沒去動過輸入框，直接顯示 value 格式化後的文字；一旦開始打字才用 draft
  // 蓋過去。這樣 value 從外面變的時候不用另外用 effect 同步，重新 render 就對了。
  const [draft, setDraft] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const text = draft ?? (value ? formatDisplay(value) : "");

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current && value) {
      listRef.current.querySelector<HTMLElement>(`[data-value="${value}"]`)?.scrollIntoView({ block: "center" });
    }
  }, [open, value]);

  function commit(raw: string) {
    const parsed = parseTimeInput(raw);
    if (parsed) onChange(parsed);
    setDraft(null);
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <input
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit(e.currentTarget.value);
            setOpen(false);
            e.currentTarget.blur();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="時間"
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              data-value={t}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(t);
                setDraft(null);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm ${
                t === value ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {formatDisplay(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
