"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useTaskCountsByProject } from "@/hooks/use-tasks";
import { projectStatusLabel, projectStatusSortRank } from "@/lib/types";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import type { AreaType } from "@/lib/types";

type SortKey = "created_desc" | "created_asc" | "name" | "status" | "progress_desc";

function ProjectsContent() {
  const searchParams = useSearchParams();
  const areaFilter = (searchParams.get("area") as AreaType | null) ?? null;

  const { data: areas } = useAreas();
  const { data: projects, isLoading } = useProjects();
  const { data: counts } = useTaskCountsByProject();
  const [dialogArea, setDialogArea] = useState<AreaType | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");

  const filtered = useMemo(() => {
    const rows = (projects ?? []).filter((p) => {
      if (!areaFilter) return true;
      return areas?.find((a) => a.id === p.area_id)?.type === areaFilter;
    });

    function progressOf(id: string) {
      const c = counts?.[id];
      return c && c.total > 0 ? c.completed / c.total : -1;
    }

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortKey === "created_desc") return b.created_at.localeCompare(a.created_at);
      if (sortKey === "created_asc") return a.created_at.localeCompare(b.created_at);
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "status") return projectStatusSortRank(a) - projectStatusSortRank(b);
      return progressOf(b.id) - progressOf(a.id);
    });
    return sorted;
  }, [projects, areas, areaFilter, counts, sortKey]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {areaFilter === "personal" ? "個人 Project" : areaFilter === "work" ? "工作 Project" : "所有 Project"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {areaFilter ? (
              <Link href="/projects" className="underline">
                清除篩選
              </Link>
            ) : (
              "有明確成果或持續一段時間的工作集合。"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm text-neutral-600"
          >
            <option value="created_desc">建立時間（新到舊）</option>
            <option value="created_asc">建立時間（舊到新）</option>
            <option value="name">名稱</option>
            <option value="status">狀態</option>
            <option value="progress_desc">完成度（高到低）</option>
          </select>
          <button
            onClick={() => setDialogArea(areaFilter ?? "work")}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            + 新增 Project
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">載入中…</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-neutral-500">還沒有 Project，按右上角新增一個。</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const c = counts?.[p.id];
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="truncate text-sm font-semibold text-neutral-900">{p.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">{projectStatusLabel(p)}</span>
                {p.category && <span className="rounded bg-neutral-100 px-1.5 py-0.5">{p.category}</span>}
                {c && (
                  <span>
                    {c.completed}/{c.total} 完成
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {dialogArea && (
        <ProjectFormDialog defaultArea={dialogArea} onClose={() => setDialogArea(null)} />
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">載入中…</p>}>
      <ProjectsContent />
    </Suspense>
  );
}
