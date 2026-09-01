"use client";

import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { ColorPicker } from "@/components/ui/color-picker";
import { getContrastTextColor } from "@/lib/colors";

export default function ColorSettingsPage() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  if (isLoading || !settings) {
    return <p className="text-sm text-neutral-500">載入中…</p>;
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">顏色設定</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Personal 用單一預設色；Work 每個 Project 各自有顏色，這裡設定的是「Work Task 沒有掛
          Project 時」用的 fallback 色。
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Personal 預設顏色</h2>
        <ColorPicker
          value={settings.personal_default_color}
          onChange={(color) => updateSettings.mutate({ personal_default_color: color })}
        />
        <PreviewChip color={settings.personal_default_color} label="個人任務範例" />
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Work Fallback 顏色</h2>
        <ColorPicker
          value={settings.work_fallback_color}
          onChange={(color) => updateSettings.mutate({ work_fallback_color: color })}
        />
        <PreviewChip color={settings.work_fallback_color} label="沒有 Project 的工作任務" />
      </section>
    </div>
  );
}

function PreviewChip({ color, label }: { color: string; label: string }) {
  return (
    <div
      className="inline-flex rounded-md px-3 py-1.5 text-sm font-medium"
      style={{ background: color, color: getContrastTextColor(color) }}
    >
      {label}
    </div>
  );
}
