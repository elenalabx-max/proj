"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTaskPanelStore } from "@/stores/task-panel";
import { TASK_STATUS_LABEL, type Task } from "@/lib/types";

type SearchResults = {
  tasks: Task[];
  todos: { id: string; title: string }[];
  projects: { id: string; name: string; color: string }[];
  people: { id: string; name: string }[];
};

function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async (): Promise<SearchResults> => {
      const supabase = createClient();
      const like = `%${query}%`;

      const [tasks, todos, projects, people] = await Promise.all([
        supabase.from("tasks").select("*").ilike("title", like).is("archived_at", null).limit(8),
        supabase.from("todos").select("id, title").ilike("title", like).is("archived_at", null).limit(8),
        supabase.from("projects").select("id, name, color").ilike("name", like).is("archived_at", null).limit(8),
        supabase.from("people").select("id, name").ilike("name", like).is("archived_at", null).limit(8),
      ]);

      return {
        tasks: (tasks.data ?? []) as Task[],
        todos: todos.data ?? [],
        projects: projects.data ?? [],
        people: people.data ?? [],
      };
    },
    enabled: query.trim().length > 0,
  });
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = useGlobalSearch(query.trim());
  const openTask = useTaskPanelStore((s) => s.open);
  const router = useRouter();

  function close() {
    setOpen(false);
    setQuery("");
  }

  const hasResults =
    results && (results.tasks.length || results.todos.length || results.projects.length || results.people.length);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
        title="搜尋"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M13.5 13.5 10.5 10.5" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 px-4 pt-24" onClick={close}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-neutral-200 bg-white shadow-lg"
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋 Task / Todo / Project / Person…"
              className="w-full border-b border-neutral-200 px-4 py-3 text-sm outline-none"
            />

            <div className="max-h-96 overflow-y-auto p-2 text-sm">
              {isFetching && <p className="px-2 py-2 text-xs text-neutral-400">搜尋中…</p>}
              {!isFetching && query && !hasResults && <p className="px-2 py-2 text-xs text-neutral-400">沒有找到符合的結果。</p>}

              {!!results?.projects.length && (
                <ResultGroup label="Projects">
                  {results.projects.map((p) => (
                    <ResultRow
                      key={p.id}
                      dotColor={p.color}
                      title={p.name}
                      onClick={() => {
                        router.push(`/projects/${p.id}`);
                        close();
                      }}
                    />
                  ))}
                </ResultGroup>
              )}

              {!!results?.tasks.length && (
                <ResultGroup label="Tasks">
                  {results.tasks.map((t) => (
                    <ResultRow
                      key={t.id}
                      title={t.title}
                      meta={TASK_STATUS_LABEL[t.status]}
                      onClick={() => {
                        openTask(t.id);
                        close();
                      }}
                    />
                  ))}
                </ResultGroup>
              )}

              {!!results?.todos.length && (
                <ResultGroup label="Todos">
                  {results.todos.map((t) => (
                    <ResultRow
                      key={t.id}
                      title={t.title}
                      onClick={() => {
                        router.push("/inbox");
                        close();
                      }}
                    />
                  ))}
                </ResultGroup>
              )}

              {!!results?.people.length && (
                <ResultGroup label="People">
                  {results.people.map((p) => (
                    <ResultRow key={p.id} title={p.name} onClick={close} />
                  ))}
                </ResultGroup>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div>
      {children}
    </div>
  );
}

function ResultRow({
  title,
  meta,
  dotColor,
  onClick,
}: {
  title: string;
  meta?: string;
  dotColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-neutral-50"
    >
      <span className="flex min-w-0 items-center gap-2">
        {dotColor && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor }} />}
        <span className="truncate text-neutral-900">{title}</span>
      </span>
      {meta && <span className="shrink-0 text-xs text-neutral-400">{meta}</span>}
    </button>
  );
}
