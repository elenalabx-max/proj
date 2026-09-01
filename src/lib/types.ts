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
  linked_type: ReminderLinkedType | null;
  linked_id: string | null;
  title: string | null;
  note: string | null;
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
