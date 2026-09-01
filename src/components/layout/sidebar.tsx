"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import {
  CalendarIcon,
  CompletedIcon,
  ForgottenIcon,
  InboxIcon,
  ReviewIcon,
  SettingsIcon,
  TodayIcon,
  WaitingIcon,
} from "./icons";

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${
        active ? "bg-neutral-900/5 text-neutral-900" : "text-neutral-600 hover:bg-neutral-900/5"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function DisabledNavItem({
  icon,
  label,
  phase,
}: {
  icon: React.ReactNode;
  label: string;
  phase: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium text-neutral-300">
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">
        {phase}
      </span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();

  const workProjects = (projects ?? []).filter(
    (p) => areas?.find((a) => a.id === p.area_id)?.type === "work",
  );

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-5 border-r border-neutral-200 bg-neutral-50/60 px-3 py-4">
      <div className="px-2 text-sm font-bold tracking-tight text-neutral-900">Aftertask</div>

      <nav className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <NavLink href="/today" icon={<TodayIcon />} label="Today" active={pathname === "/today"} />
          <NavLink
            href="/calendar"
            icon={<CalendarIcon />}
            label="Calendar"
            active={pathname.startsWith("/calendar")}
          />
        </div>

        <div className="flex flex-col gap-0.5 border-t border-neutral-200 pt-3">
          <NavLink href="/inbox" icon={<InboxIcon />} label="Inbox" active={pathname === "/inbox"} />
          <DisabledNavItem icon={<WaitingIcon />} label="Waiting" phase="Phase 6" />
          <DisabledNavItem icon={<ReviewIcon />} label="Review" phase="Phase 6" />
          <DisabledNavItem icon={<ForgottenIcon />} label="Forgotten" phase="Phase 9" />
        </div>

        <div className="flex flex-col gap-0.5 border-t border-neutral-200 pt-3">
          <Link
            href="/projects?area=personal"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-900/5"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#9a86ac]" />
            Personal
          </Link>
        </div>

        <div className="flex flex-col gap-0.5 border-t border-neutral-200 pt-3">
          <Link
            href="/projects?area=work"
            className="px-2.5 py-1 text-[13px] font-semibold text-neutral-900 hover:underline"
          >
            Work
          </Link>
          {workProjects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-900/5"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-0.5 border-t border-neutral-200 pt-3">
          <DisabledNavItem icon={<CompletedIcon />} label="Completed" phase="之後" />
          <NavLink
            href="/settings/colors"
            icon={<SettingsIcon />}
            label="Settings"
            active={pathname.startsWith("/settings")}
          />
        </div>
      </nav>
    </aside>
  );
}
