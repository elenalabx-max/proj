-- ============================================================
-- 0005_todo_reminder_recurrence.sql
-- Todo 的 recurrence_rule_id 從 0001 就有了，這裡只補 Reminder 的部分，
-- 並且讓 recurrence_instances 也能記錄「這是哪個 Reminder 的例外」。
-- ============================================================

alter table reminders
  add column recurrence_rule_id uuid references recurrence_rules on delete set null;

alter table recurrence_instances
  add column reminder_id uuid references reminders on delete cascade;
