"use client";

import { PRESET_COLORS } from "@/lib/colors";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-6 w-6 rounded-full ring-offset-2"
          style={{
            background: c,
            boxShadow: value.toLowerCase() === c.toLowerCase() ? "0 0 0 2px #171717" : undefined,
          }}
          aria-label={c}
        />
      ))}
      <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-neutral-300">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -left-1 -top-1 h-8 w-8 cursor-pointer"
        />
      </label>
      <span className="ml-1 font-mono text-xs text-neutral-500">{value}</span>
    </div>
  );
}
