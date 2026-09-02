import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebarToggle } from "@/components/layout/mobile-sidebar-toggle";
import { QuickAdd } from "@/components/layout/quick-add";
import { ActiveTimerBadge } from "@/components/layout/active-timer-badge";
import { GlobalSearch } from "@/components/layout/global-search";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { ReminderDetailPanel } from "@/components/reminders/reminder-detail-panel";
import { TodoDetailPanel } from "@/components/todos/todo-detail-panel";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:gap-4 md:px-6">
          <MobileSidebarToggle />
          <QuickAdd />
          <GlobalSearch />
          <ActiveTimerBadge />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-neutral-500 sm:inline">{user?.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                登出
              </button>
            </form>
          </div>
        </header>
        <main className="w-full flex-1 px-6 py-8">{children}</main>
      </div>
      <TaskDetailPanel />
      <ReminderDetailPanel />
      <TodoDetailPanel />
    </div>
  );
}
