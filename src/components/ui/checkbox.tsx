"use client";

// 純視覺用的勾選框（配色跟其餘 UI 一致），實際的可點擊/可聚焦元素由外層按鈕/label 負責，
// 避免又是 <input> 又是外層 onClick 疊在一起變成點兩下互相抵銷。
export function CheckboxIcon({ checked, className = "" }: { checked: boolean; className?: string }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
        checked ? "border-neutral-900 bg-neutral-900" : "border-neutral-300 bg-white"
      } ${className}`}
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5 6.5 11.5 12.5 5" />
        </svg>
      )}
    </span>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: () => void;
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`flex items-center gap-2 text-left ${className}`}
    >
      <CheckboxIcon checked={checked} />
      {label}
    </button>
  );
}
