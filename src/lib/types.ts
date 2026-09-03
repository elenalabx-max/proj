export type AreaType = "personal" | "work";

export type Area = {
  id: string;
  user_id: string;
  type: AreaType;
  name: string;
  created_at: string;
};

export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export type Project = {
  id: string;
  user_id: string;
  area_id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  category: string | null;
  owner: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

// 2026-09-03 調整：拿掉「收集箱」與「進行中」兩個狀態值（見規劃書第八節）。
// 「收集箱」改成用日期欄位判斷（沒有 due_date 也沒有 scheduled_date），
// 不再是存進 DB 的狀態；「進行中」跟「待處理」本來就沒有實質區別，直接併入 todo。
export type TaskStatus =
  | "todo"
  | "waiting"
  | "review"
  | "completed"
  | "forgotten";

export type Task = {
  id: string;
  user_id: string;
  area_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  important: boolean;
  urgent: boolean;
  due_date: string | null;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  is_all_day: boolean;
  estimated_minutes: number | null;
  assignee_id: string | null;
  delegate_date: string | null;
  delegate_deadline: string | null;
  follow_up_at: string | null;
  forgotten_until: string | null;
  recurrence_rule_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
};

export type Todo = {
  id: string;
  user_id: string;
  area_id: string | null;
  project_id: string | null;
  title: string;
  date: string | null;
  forgotten_until: string | null;
  recurrence_rule_id: string | null;
  important: boolean;
  urgent: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type Subtask = {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderLinkedType = "task" | "todo" | "project" | "standalone";

export type Reminder = {
  id: string;
  user_id: string;
  remind_at: string;
  is_all_day: boolean;
  linked_type: ReminderLinkedType | null;
  linked_id: string | null;
  title: string | null;
  note: string | null;
  recurrence_rule_id: string | null;
  important: boolean;
  urgent: boolean;
  completed_at: string | null;
  created_at: string;
};

export type RecurrenceRule = {
  id: string;
  user_id: string;
  rrule_text: string;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
};

export type RecurrenceInstance = {
  id: string;
  user_id: string;
  recurrence_rule_id: string;
  task_id: string | null;
  todo_id: string | null;
  reminder_id: string | null;
  instance_date: string;
  is_cancelled: boolean;
  override_title: string | null;
  override_scheduled_start: string | null;
  override_scheduled_end: string | null;
  completed_at: string | null;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  timezone: string;
  locale: string;
  personal_default_color: string;
  work_fallback_color: string;
  week_start: 0 | 1;
  default_calendar_view: "month" | "week" | "day";
  dark_mode: "system" | "light" | "dark";
  updated_at: string;
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待處理",
  waiting: "待他人",
  review: "待我確認",
  completed: "完成",
  forgotten: "遺忘",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: "進行中",
  paused: "暫停",
  completed: "已完成",
  archived: "已封存",
};

// 還沒填執行期間的「進行中」Project，顯示上當作「尚未開始」——不是另一個
// 真的存進 DB 的狀態，只是還沒排執行期間時的顯示文字，一旦填了起訖日期
// 就會自動變回「進行中」，不用手動切換。
export function projectStatusLabel(project: Pick<Project, "status" | "start_date" | "due_date">): string {
  if (project.status === "active" && !project.start_date && !project.due_date) return "尚未開始";
  return PROJECT_STATUS_LABEL[project.status];
}

// 依「狀態」排序時不能直接比較 status 這個 enum 字串本身——alphabetical 順序
// 沒有意義，而且「尚未開始」根本不是真的存進 DB 的狀態（跟「進行中」共用
// active），照 status 排會被混在一起分不開。改成照 projectStatusLabel()
// 算出來的顯示文字給一個有邏輯的順序：尚未開始 → 進行中 → 暫停 → 已完成 → 已封存。
const PROJECT_STATUS_SORT_RANK: Record<string, number> = {
  尚未開始: 0,
  進行中: 1,
  暫停: 2,
  已完成: 3,
  已封存: 4,
};

export function projectStatusSortRank(project: Pick<Project, "status" | "start_date" | "due_date">): number {
  return PROJECT_STATUS_SORT_RANK[projectStatusLabel(project)] ?? 99;
}
