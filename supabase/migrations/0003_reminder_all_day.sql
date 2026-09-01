-- ============================================================
-- 0003_reminder_all_day.sql
-- Reminder 需要支援「整天」（不用精確時間），也需要能改成掛/不掛 Project。
-- linked_type/linked_id 本來就是多型欄位，改掛 Project 只是改這兩欄，不用動 schema。
-- ============================================================

alter table reminders
  add column is_all_day boolean not null default false;
