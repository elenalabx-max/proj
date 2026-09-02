"use client";

import { useState } from "react";
import { useProjectStats } from "@/hooks/use-project-stats";
import { formatMinutes } from "@/hooks/use-elapsed";

export function ProjectStatsPanel({ projectId }: { projectId: string }) {
  const { data: stats, isLoading } = useProjectStats(projectId);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading || !stats) return null;
  if (stats.rows.length === 0) return null;

  const diff = stats.totalActual - stats.totalEstimated;
  const diffPct = stats.totalEstimated > 0 ? Math.round((diff / stats.totalEstimated) * 100) : null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Statistics</h2>
        <button onClick={() => setDetailOpen(true)} className="text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline">
          查看各 Task 明細
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="總預計" value={formatMinutes(stats.totalEstimated)} />
        <StatCard label="總實際" value={formatMinutes(stats.totalActual)} />
        <StatCard
          label="差異"
          value={`${diff >= 0 ? "+" : ""}${formatMinutes(diff)}${diffPct !== null ? ` (${diff >= 0 ? "+" : ""}${diffPct}%)` : ""}`}
          tone={diff > 0 ? "warn" : diff < 0 ? "good" : "neutral"}
        />
      </div>

      {detailOpen && <StatsDetailDialog rows={stats.rows} onClose={() => setDetailOpen(false)} />}
    </section>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "good" | "warn" | "neutral" }) {
  const toneClass = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-neutral-900";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatsDetailDialog({
  rows,
  onClose,
}: {
  rows: { id: string; title: string; estimated: number; actual: number }[];
  onClose: () => void;
}) {
  // 實際超出預計最多的排最上面，最需要留意的一眼就看到。
  const sorted = [...rows].sort((a, b) => b.actual - b.estimated - (a.actual - a.estimated));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">各 Task 工時明細</h3>
          <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-700">
            關閉
          </button>
        </div>
        <div className="max-h-96 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200">
          {sorted.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="min-w-0 truncate text-neutral-700">{r.title}</span>
              <span className="shrink-0 font-mono text-neutral-500">
                預計 {formatMinutes(r.estimated)} ・ 實際 {formatMinutes(r.actual)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
