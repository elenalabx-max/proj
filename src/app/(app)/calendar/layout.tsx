"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AreaProjectFilter } from "@/components/calendar/area-project-filter";

const TABS = [
  { href: "/calendar/month", label: "Month" },
  { href: "/calendar/week", label: "Week" },
  { href: "/calendar/day", label: "Day" },
];

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Calendar</h1>
        <div className="flex gap-1 rounded-md border border-neutral-200 bg-white p-0.5">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded px-3 py-1 text-sm font-medium ${
                pathname.startsWith(t.href)
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-6">
        <AreaProjectFilter />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
