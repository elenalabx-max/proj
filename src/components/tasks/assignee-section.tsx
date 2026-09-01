"use client";

import { useState } from "react";
import { useCreatePerson, usePeople } from "@/hooks/use-people";
import { useUpdateTask } from "@/hooks/use-tasks";
import type { Task } from "@/lib/types";

// datetime-local 的 value 要是 "YYYY-MM-DDTHH:mm"（本地時間，不含秒/時區）
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssigneeSection({ task }: { task: Task }) {
  const { data: people } = usePeople();
  const createPerson = useCreatePerson();
  const updateTask = useUpdateTask();
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleSelect(value: string) {
    if (value === "__new__") {
      setAddingPerson(true);
      return;
    }
    if (!value) {
      // 取消交辦：清空交辦相關欄位，退回 todo（見規劃書第 36 節）
      updateTask.mutate({
        id: task.id,
        patch: {
          assignee_id: null,
          delegate_date: null,
          delegate_deadline: null,
          follow_up_at: null,
          status: "todo",
        },
      });
      return;
    }
    // 交辦給人 → 這件事現在不是我要處理的，狀態變 waiting（規劃書第 14 節）
    updateTask.mutate({ id: task.id, patch: { assignee_id: value, status: "waiting" } });
  }

  async function handleCreatePerson(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const person = await createPerson.mutateAsync(name);
    updateTask.mutate({ id: task.id, patch: { assignee_id: person.id, status: "waiting" } });
    setAddingPerson(false);
    setNewName("");
  }

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-medium text-neutral-500">交辦 Assignee</label>

      {addingPerson ? (
        <form onSubmit={handleCreatePerson} className="flex gap-1.5">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="輸入姓名…"
            className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
          />
          <button type="submit" className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs hover:bg-neutral-50">
            建立
          </button>
          <button type="button" onClick={() => setAddingPerson(false)} className="text-xs text-neutral-400">
            取消
          </button>
        </form>
      ) : (
        <select
          value={task.assignee_id ?? ""}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">未交辦</option>
          {people?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="__new__">+ 新增人員…</option>
        </select>
      )}

      {task.assignee_id && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-neutral-400">對方 Deadline</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(task.delegate_deadline)}
              onChange={(e) =>
                updateTask.mutate({
                  id: task.id,
                  patch: { delegate_deadline: e.target.value ? new Date(e.target.value).toISOString() : null },
                })
              }
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-neutral-400">我的 Follow-up</label>
            <input
              type="datetime-local"
              value={toLocalInputValue(task.follow_up_at)}
              onChange={(e) =>
                updateTask.mutate({
                  id: task.id,
                  patch: { follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null },
                })
              }
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
