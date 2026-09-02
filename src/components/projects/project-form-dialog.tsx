"use client";

import { useState } from "react";
import { useAreas } from "@/hooks/use-areas";
import { useCreateProject, useUpdateProject } from "@/hooks/use-projects";
import { ColorPicker } from "@/components/ui/color-picker";
import { PRESET_COLORS } from "@/lib/colors";
import { PROJECT_STATUS_LABEL, type AreaType, type Project, type ProjectStatus } from "@/lib/types";

const STATUS_OPTIONS = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[];

// 建立跟編輯共用同一個表單：有帶 project 進來就是編輯模式（預填現有資料、
// 送出時用 update），沒有就是新增模式——所有基本資料（名稱/顏色/類別/業主/
// 執行期間/狀態）都集中在這裡一次填完、按儲存才真的寫入，不是點開頁面
// 就每個欄位各自即時存檔。
export function ProjectFormDialog({
  defaultArea,
  project,
  onClose,
}: {
  defaultArea?: AreaType;
  project?: Project;
  onClose: (createdOrUpdatedProjectId?: string) => void;
}) {
  const { data: areas } = useAreas();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEdit = !!project;

  const [name, setName] = useState(project?.name ?? "");
  const [areaType, setAreaType] = useState<AreaType>(() => {
    if (project) return areas?.find((a) => a.id === project.area_id)?.type ?? "work";
    return defaultArea ?? "work";
  });
  const [color, setColor] = useState<string>(project?.color ?? PRESET_COLORS[0]);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [category, setCategory] = useState(project?.category ?? "");
  const [owner, setOwner] = useState(project?.owner ?? "");
  const [startDate, setStartDate] = useState(project?.start_date ?? "");
  const [dueDate, setDueDate] = useState(project?.due_date ?? "");

  const areaId = areas?.find((a) => a.type === areaType)?.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !areaId) return;

    if (isEdit) {
      await updateProject.mutateAsync({
        id: project.id,
        patch: {
          name: name.trim(),
          area_id: areaId,
          color,
          status,
          category: category.trim() || null,
          owner: owner.trim() || null,
          start_date: startDate || null,
          due_date: dueDate || null,
        },
      });
      onClose(project.id);
    } else {
      const created = await createProject.mutateAsync({
        area_id: areaId,
        name: name.trim(),
        color,
        start_date: startDate || null,
        due_date: dueDate || null,
      });
      onClose(created.id);
    }
  }

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-lg"
      >
        <h2 className="text-base font-semibold text-neutral-900">{isEdit ? "編輯 Project" : "新增 Project"}</h2>

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

        {isEdit && (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">狀態</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">類別</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-neutral-500">業主</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-500"
            />
          </div>
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
            disabled={isPending}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isEdit ? "儲存" : "建立"}
          </button>
        </div>
      </form>
    </div>
  );
}
