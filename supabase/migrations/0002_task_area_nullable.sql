-- ============================================================
-- 0002_task_area_nullable.sql
-- Phase 2 開發時發現的 schema 缺口：
-- Inbox 快速新增的精神是「連 Personal/Work 都還沒決定」，
-- 但 0001 把 tasks.area_id 設成 not null，會擋掉這個情境。
-- 這裡放寬成跟 todos.area_id 一致（nullable），指派 Project 或
-- 明確選 Area 時才補上。
-- ============================================================

alter table tasks
  alter column area_id drop not null;

alter table tasks
  drop constraint if exists tasks_area_id_fkey;

alter table tasks
  add constraint tasks_area_id_fkey
    foreign key (area_id) references areas (id) on delete set null;
