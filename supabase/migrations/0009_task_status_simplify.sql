-- ============================================================
-- 0009_task_status_simplify.sql
-- 拿掉 Task status 的 'inbox' 與 'in_progress'（見規劃書第八節，2026-09-03 調整）：
-- - 'inbox' 不再是一個狀態值，Inbox 改成用 due_date/scheduled_date 都是
--   null 判斷（見 src/hooks/use-tasks.ts 的 useInboxTasks）
-- - 'in_progress' 跟 'todo' 沒有實質區別，直接併入 todo
-- ============================================================

update tasks set status = 'todo' where status in ('inbox', 'in_progress');

alter table tasks drop constraint if exists tasks_status_check;

alter table tasks alter column status set default 'todo';

alter table tasks add constraint tasks_status_check
  check (status in ('todo', 'waiting', 'review', 'completed', 'forgotten'));
