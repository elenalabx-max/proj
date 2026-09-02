"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAreas } from "@/hooks/use-areas";
import { useProjects } from "@/hooks/use-projects";
import { useReviewTasks } from "@/hooks/use-tasks";
import { useSidebarStore } from "@/stores/sidebar";
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
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const close = useSidebarStore((s) => s.close);

  const personalProjects = (projects ?? []).filter(
    (p) => areas?.find((a) => a.id === p.area_id)?.type === "personal",
  );
  const workProjects = (projects ?? []).filter(
    (p) => areas?.find((a) => a.id === p.area_id)?.type === "work",
  );

  return (
    <>
      {/* 手機上打開抽屜時的暗色背景，點一下關掉——桌面版（md 以上）完全不會出現。 */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={close} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 -translate-x-full flex-col gap-5 overflow-y-auto border-r border-neutral-200 bg-neutral-50 px-3 py-4 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:bg-neutral-50/60 ${
          mobileOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="px-2 text-sm font-bold tracking-tight text-neutral-900">Aftertask</div>

        {/* 點任何連結就收起抽屜，跟大部分手機 App 的側欄行為一致。 */}
        <nav onClick={close} className="flex flex-col gap-4">
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
            className="px-2.5 py-1 text-[13px] font-semibold text-neutral-900 hover:underline"
          >
            Personal
          </Link>
          {personalProjects.map((p) => (
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
    </>
  );
}
