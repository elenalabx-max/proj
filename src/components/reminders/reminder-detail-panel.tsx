"use client";

import { useState } from "react";
import { useReminderPanelStore } from "@/stores/reminder-panel";
import { useReminder, useUpdateReminder, useDeleteReminder } from "@/hooks/use-reminders";
import { useProjects } from "@/hooks/use-projects";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/time-picker";
import { RepeatSection } from "./repeat-section";
import type { Project, Reminder } from "@/lib/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toLocalDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function combineLocal(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}`).toISOString();
}

export function ReminderDetailPanel() {
  const reminderId = useReminderPanelStore((s) => s.reminderId);
  const close = useReminderPanelStore((s) => s.close);
  const { data: reminder } = useReminder(reminderId);
  const { data: projects } = useProjects();

  if (!reminderId || !reminder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={close}>
      {/* keyed by reminder.id so the buffered title field resets per reminder without an effect */}
      <ReminderPanelBody key={reminder.id} reminder={reminder} projects={projects ?? []} close={close} />
    </div>
  );
}

function ReminderPanelBody({
  reminder,
  projects,
  close,
}: {
  reminder: Reminder;
  projects: Project[];
  close: () => void;
}) {
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();

  const [title, setTitle] = useState(reminder.title ?? "");
  const [date, setDate] = useState(toLocalDate(reminder.remind_at));
  const [time, setTime] = useState(toLocalTime(reminder.remind_at));

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Reminder</span>
        <button onClick={close} className="text-sm text-neutral-400 hover:text-neutral-700">
          關閉
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title !== (reminder.title ?? "") && updateReminder.mutate({ id: reminder.id, patch: { title: title || null } })}
        placeholder="提醒標題"
        className="w-full border-b border-transparent text-base font-semibold outline-none focus:border-neutral-300"
      />

      <div className="space-y-3 text-sm">
        <div className="flex gap-4">
          <Checkbox
            checked={reminder.important}
            onChange={() => updateReminder.mutate({ id: reminder.id, patch: { important: !reminder.important } })}
            label="重要"
          />
          <Checkbox
            checked={reminder.urgent}
            onChange={() => updateReminder.mutate({ id: reminder.id, patch: { urgent: !reminder.urgent } })}
            label="緊急"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Project</label>
          <select
            value={reminder.linked_type === "project" ? reminder.linked_id ?? "" : ""}
            onChange={(e) => {
              const projectId = e.target.value;
              updateReminder.mutate({
                id: reminder.id,
                patch: projectId
                  ? { linked_type: "project", linked_id: projectId }
                  : { linked_type: "standalone", linked_id: null },
              });
            }}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            <option value="">不掛 Project（不會顯示在 Calendar）</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-neutral-500">時間（單一時間點，不用區間）</label>
          <Checkbox
            checked={reminder.is_all_day}
            onChange={() =>
              updateReminder.mutate({
                id: reminder.id,
                patch: { is_all_day: !reminder.is_all_day },
              })
            }
            className="text-xs"
            label="整天"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              updateReminder.mutate({ id: reminder.id, patch: { remind_at: combineLocal(e.target.value, time) } });
            }}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
          {!reminder.is_all_day && (
            <TimePicker
              value={time}
              onChange={(t) => {
                setTime(t);
                updateReminder.mutate({ id: reminder.id, patch: { remind_at: combineLocal(date, t) } });
              }}
              className="flex-1"
            />
          )}
        </div>

        <Checkbox
          checked={!!reminder.completed_at}
          onChange={() =>
            updateReminder.mutate({
              id: reminder.id,
              patch: { completed_at: reminder.completed_at ? null : new Date().toISOString() },
            })
          }
          label="完成"
        />

        <RepeatSection reminder={reminder} />

        <button
          onClick={() => {
            deleteReminder.mutate(reminder.id);
            close();
          }}
          className="text-xs font-medium text-red-500 hover:underline"
        >
          刪除提醒
        </button>
      </div>
    </div>
  );
}
