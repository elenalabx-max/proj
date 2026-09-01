"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useTaskPanelStore } from "@/stores/task-panel";
import type { Task } from "@/lib/types";

function useCompletedTasks() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["tasks", "completed", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "completed")
        .is("archived_at", null)
        .order("completed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}

export default function CompletedPage() {
  const { data: tasks, isLoading } = useCompletedTasks();
  const openTask = useTaskPanelStore((s) => s.open);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Completed</h1>
        <p className="mt-1 text-sm text-neutral-500">已經確認結案的 Task（最近 200 筆）。</p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">載入中…</p>}
      {!isLoading && tasks?.length === 0 && <p className="text-sm text-neutral-400">還沒有完成的 Task。</p>}

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {tasks?.map((t) => (
          <button
            key={t.id}
            onClick={() => openTask(t.id)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
          >
            <span className="truncate text-neutral-400">{t.title}</span>
            <span className="shrink-0 text-xs text-neutral-400">
              {t.completed_at ? new Date(t.completed_at).toLocaleDateString("zh-TW") : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
