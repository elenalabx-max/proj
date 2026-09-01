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
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type TaskStatus =
  | "inbox"
  | "todo"
  | "in_progress"
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
  title: string;
  date: string | null;
  forgotten_until: string | null;
  recurrence_rule_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
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
  inbox: "收集箱",
  todo: "待處理",
  in_progress: "進行中",
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
