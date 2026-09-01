"use client";

import { useState } from "react";
import { useAreas } from "@/hooks/use-areas";
import { useCreateProject } from "@/hooks/use-projects";
import { ColorPicker } from "@/components/ui/color-picker";
import { PRESET_COLORS } from "@/lib/colors";
import type { AreaType } from "@/lib/types";

export function ProjectFormDialog({
  defaultArea,
  onClose,
}: {
  defaultArea: AreaType;
  onClose: (createdProjectId?: string) => void;
}) {
  const { data: areas } = useAreas();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [areaType, setAreaType] = useState<AreaType>(defaultArea);
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const areaId = areas?.find((a) => a.type === areaType)?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !areaId) return;

    const project = await createProject.mutateAsync({
      area_id: areaId,
      name: name.trim(),
      color,
      start_date: startDate || null,
      due_date: dueDate || null,
    });
    onClose(project.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg"
      >
        <h2 className="text-base font-semibold text-neutral-900">新增 Project</h2>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">名稱</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Area</label>
          <div className="flex gap-2">
            {(["personal", "work"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAreaType(t)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  areaType === t
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600"
                }`}
              >
                {t === "personal" ? "個人" : "工作"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Project Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">開始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">截止日期</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => onClose()}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={createProject.isPending}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            建立
          </button>
        </div>
      </form>
    </div>
  );
}
