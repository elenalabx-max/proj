"use client";

import { useState } from "react";

type EntityItem = { id: string; title: string; completed: boolean; subtitle?: string | null };

// Task 以外的完成度小統計——Todo、Reminder 各用一個，畫法跟 ProjectStatsPanel
// 的「查看明細」彈窗一樣：預設只顯示進度條，明細要點開才看，避免清單一長就
// 把整個 Project 頁面拉很長。未完成的排最上面，比較容易一眼看出還剩什麼。
export function ProjectEntityProgress({
  label,
  items,
  onOpenItem,
}: {
  label: string;
  items: EntityItem[];
  onOpenItem: (id: string) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);

  if (items.length === 0) return null;

  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const sorted = [...items].sort((a, b) => Number(a.completed) - Number(b.completed));

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs text-neutral-400">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-neutral-500">
          {pct}%（{completed}/{total}）
        </span>
        <button
          onClick={() => setDetailOpen(true)}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline"
        >
          查看明細
        </button>
      </div>

      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={() => setDetailOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">{label}明細</h3>
              <button onClick={() => setDetailOpen(false)} className="text-sm text-neutral-400 hover:text-neutral-700">
                關閉
              </button>
            </div>
            <div className="max-h-96 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
              {sorted.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onOpenItem(item.id);
                    setDetailOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-neutral-50"
                >
                  <span className={`min-w-0 truncate ${item.completed ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
                    {item.title}
                  </span>
                  {item.subtitle && <span className="shrink-0 font-mono text-neutral-400">{item.subtitle}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
