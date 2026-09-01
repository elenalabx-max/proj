"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useReviewTasks } from "@/hooks/use-tasks";
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

export function Sidebar() {
  const pathname = usePathname();
  const { data: areas } = useAreas();
  const { data: projects } = useProjects();
  const { data: reviewTasks } = useReviewTasks();

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
          <NavLink href="/waiting" icon={<WaitingIcon />} label="Waiting" active={pathname === "/waiting"} />
          <div className="relative">
            <NavLink href="/review" icon={<ReviewIcon />} label="Review" active={pathname === "/review"} />
            {!!reviewTasks?.length && (
              <span className="absolute top-1.5 right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {reviewTasks.length}
              </span>
            )}
          </div>
          <NavLink href="/forgotten" icon={<ForgottenIcon />} label="Forgotten" active={pathname === "/forgotten"} />
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
          <NavLink href="/completed" icon={<CompletedIcon />} label="Completed" active={pathname === "/completed"} />
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
