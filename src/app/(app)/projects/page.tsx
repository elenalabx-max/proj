"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useTaskCountsByProject } from "@/hooks/use-tasks";
import { PROJECT_STATUS_LABEL } from "@/lib/types";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import type { AreaType } from "@/lib/types";

function ProjectsContent() {
  const searchParams = useSearchParams();
  const areaFilter = (searchParams.get("area") as AreaType | null) ?? null;

  const { data: areas } = useAreas();
  const { data: projects, isLoading } = useProjects();
  const { data: counts } = useTaskCountsByProject();
  const [dialogArea, setDialogArea] = useState<AreaType | null>(null);

  const filtered = (projects ?? []).filter((p) => {
    if (!areaFilter) return true;
    return areas?.find((a) => a.id === p.area_id)?.type === areaFilter;
  });

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
        <button
          onClick={() => setDialogArea(areaFilter ?? "work")}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          + 新增 Project
        </button>
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
              <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">{PROJECT_STATUS_LABEL[p.status]}</span>
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
