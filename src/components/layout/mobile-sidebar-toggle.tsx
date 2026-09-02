"use client";

import { useSidebarStore } from "@/stores/sidebar";

export function MobileSidebarToggle() {
  const toggle = useSidebarStore((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 md:hidden"
      title="選單"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4.5h12M2 8h12M2 11.5h12" />
      </svg>
    </button>
  );
}
