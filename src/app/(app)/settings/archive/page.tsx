"use client";

import { useArchivedTasks, useRestoreTask } from "@/hooks/use-tasks";
import { useArchivedProjects, useRestoreProject } from "@/hooks/use-projects";
import { useArchivedTodos, useRestoreTodo } from "@/hooks/use-todos";

export default function ArchivePage() {
  const { data: tasks } = useArchivedTasks();
  const { data: projects } = useArchivedProjects();
  const { data: todos } = useArchivedTodos();
  const restoreTask = useRestoreTask();
  const restoreProject = useRestoreProject();
  const restoreTodo = useRestoreTodo();

  const isEmpty = !tasks?.length && !projects?.length && !todos?.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">封存 Archive</h1>
        <p className="mt-1 text-sm text-neutral-500">
          刪除的東西都先存在這裡，不會直接消失。點「復原」可以救回來。
        </p>
      </div>

      {isEmpty && <p className="text-sm text-neutral-400">目前沒有封存的項目。</p>}

      {!!projects?.length && (
        <ArchiveSection title="Projects">
          {projects.map((p) => (
            <ArchiveRow key={p.id} title={p.name} onRestore={() => restoreProject.mutate(p.id)} />
          ))}
        </ArchiveSection>
      )}

      {!!tasks?.length && (
        <ArchiveSection title="Tasks">
          {tasks.map((t) => (
            <ArchiveRow key={t.id} title={t.title} onRestore={() => restoreTask.mutate(t.id)} />
          ))}
        </ArchiveSection>
      )}

      {!!todos?.length && (
        <ArchiveSection title="Todos">
          {todos.map((t) => (
            <ArchiveRow key={t.id} title={t.title} onRestore={() => restoreTodo.mutate(t.id)} />
          ))}
        </ArchiveSection>
      )}
    </div>
  );
}

function ArchiveSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h2>
      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">{children}</div>
    </section>
  );
}

function ArchiveRow({ title, onRestore }: { title: string; onRestore: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="truncate text-neutral-700">{title}</span>
      <button onClick={onRestore} className="shrink-0 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline">
        復原
      </button>
    </div>
  );
}
