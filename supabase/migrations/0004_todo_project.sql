-- ============================================================
-- 0004_todo_project.sql
-- Todo 可以選擇性掛 Project（不因此變成 Task，還是沒有排程/Subtask/工時）。
-- area_id 在 0001 就有了，這裡補上對稱的 project_id。
-- ============================================================

alter table todos
  add column project_id uuid references projects on delete set null;

create index idx_todos_project on todos (project_id) where archived_at is null;
