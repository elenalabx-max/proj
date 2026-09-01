"use client";

// 顯示/隱藏用的眼睛圖示（給「篩選要不要顯示在 Calendar 上」用），
// 跟 Checkbox 分開是因為這裡的語意是「看不看得到」，不是「有沒有勾選/完成」。
export function EyeToggle({
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
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center ${checked ? "text-neutral-800" : "text-neutral-300"}`}>
        {checked ? (
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 8S3.8 3.5 8 3.5 15 8 15 8s-2.8 4.5-7 4.5S1 8 1 8Z" />
            <circle cx="8" cy="8" r="1.8" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.2 4.8C3.6 3.9 5.6 3.2 8 3.2c4.2 0 7 4.5 7 4.5s-.9 1.4-2.4 2.6M4.6 5.9C2.8 7 2 8 2 8s2.8 4.5 7 4.5c1 0 1.9-.2 2.7-.6" />
            <path d="M6.4 9.6a2 2 0 0 0 2.8-2.8" />
            <path d="M2 2l12 12" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}
