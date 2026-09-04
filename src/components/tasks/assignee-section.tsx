"use client";

import { useState } from "react";
import { useCreatePerson, usePeople } from "@/hooks/use-people";
import { useUpdateTask } from "@/hooks/use-tasks";
import { TimePicker } from "@/components/ui/time-picker";
import { FollowUpIcon, DelegateDeadlineIcon } from "@/components/ui/glyphs";
import { todayISODate } from "@/lib/date";
import type { Task } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toLocalDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function combineLocal(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;
  return new Date(`${dateStr}T${timeStr || "00:00"}`).toISOString();
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
        <div className="space-y-2">
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] text-neutral-400">
              <DelegateDeadlineIcon className="h-3 w-3 shrink-0" />
              對方 Deadline
              {task.delegate_deadline && <span className="text-neutral-300">（會顯示在 Calendar 上）</span>}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={toLocalDate(task.delegate_deadline)}
                onChange={(e) =>
                  updateTask.mutate({
                    id: task.id,
                    patch: { delegate_deadline: combineLocal(e.target.value, toLocalTime(task.delegate_deadline)) },
                  })
                }
                className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
              />
              <TimePicker
                value={toLocalTime(task.delegate_deadline) || null}
                onChange={(t) =>
                  updateTask.mutate({
                    id: task.id,
                    patch: { delegate_deadline: combineLocal(toLocalDate(task.delegate_deadline) || todayISODate(), t) },
                  })
                }
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] text-neutral-400">
              <FollowUpIcon className="h-3 w-3 shrink-0" />
              我的 Follow-up
              {task.follow_up_at && <span className="text-neutral-300">（會顯示在 Calendar 上）</span>}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={toLocalDate(task.follow_up_at)}
                onChange={(e) =>
                  updateTask.mutate({
                    id: task.id,
                    patch: { follow_up_at: combineLocal(e.target.value, toLocalTime(task.follow_up_at)) },
                  })
                }
                className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
              />
              <TimePicker
                value={toLocalTime(task.follow_up_at) || null}
                onChange={(t) =>
                  updateTask.mutate({
                    id: task.id,
                    patch: { follow_up_at: combineLocal(toLocalDate(task.follow_up_at) || todayISODate(), t) },
                  })
                }
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
