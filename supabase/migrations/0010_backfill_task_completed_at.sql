-- ============================================================
-- 0010_backfill_task_completed_at.sql
-- 修正資料：Task Detail Panel 的 Status 下拉選單手動切成「完成」時，
-- 之前沒有跟著把 completed_at 設起來（只有 useCompleteTask／Review 頁面的
-- 動作有設），導致 status='completed' 但 completed_at 是 null 的舊資料，
-- 在 Completed 頁面被當成 epoch（1970/1/1）顯示。用 updated_at 當作
-- 最後一次被改動的時間，回填當作完成時間的近似值。
-- ============================================================

update tasks
set completed_at = updated_at
where status = 'completed' and completed_at is null;
