"use client";

import { useProjectStats } from "@/hooks/use-project-stats";
import { formatMinutes } from "@/hooks/use-elapsed";

export function ProjectStatsPanel({ projectId }: { projectId: string }) {
  const { data: stats, isLoading } = useProjectStats(projectId);

  if (isLoading || !stats) return null;
  if (stats.rows.length === 0) return null;

  const diff = stats.totalActual - stats.totalEstimated;
  const diffPct = stats.totalEstimated > 0 ? Math.round((diff / stats.totalEstimated) * 100) : null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-900">Statistics</h2>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="總預計" value={formatMinutes(stats.totalEstimated)} />
        <StatCard label="總實際" value={formatMinutes(stats.totalActual)} />
        <StatCard
          label="差異"
          value={`${diff >= 0 ? "+" : ""}${formatMinutes(diff)}${diffPct !== null ? ` (${diff >= 0 ? "+" : ""}${diffPct}%)` : ""}`}
          tone={diff > 0 ? "warn" : diff < 0 ? "good" : "neutral"}
        />
      </div>

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {stats.rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="truncate text-neutral-700">{r.title}</span>
            <span className="shrink-0 font-mono text-neutral-500">
              預計 {formatMinutes(r.estimated)} ・ 實際 {formatMinutes(r.actual)}
            </span>
          </div>
        ))}
      </div>
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
