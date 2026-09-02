-- ============================================================
-- 0006_todo_reminder_priority.sql
-- Todo／Reminder 也要能進四象限（重要／緊急），補上跟 tasks 一樣的
-- important/urgent 欄位。
-- ============================================================

alter table todos
  add column important boolean not null default false,
  add column urgent boolean not null default false;

alter table reminders
  add column important boolean not null default false,
  add column urgent boolean not null default false;
