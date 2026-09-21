-- ============================================================
-- 0011_reminder_area.sql
-- Reminder 也要能直接歸類到 個人／工作（跟 Task／Todo 一樣先選 Area，
-- 再選 Project）。之前 Reminder 只能靠掛 Project 才知道屬於哪個 Area，
-- 沒掛 Project 的提醒就不知道該畫在 Calendar 的 Work 還是 Personal 欄，
-- 因此完全不會出現在 Calendar 上。
-- ============================================================

alter table reminders
  add column area_id uuid references areas on delete set null;

-- 已經掛了 Project 的舊提醒，回填成那個 Project 所屬的 Area。
update reminders r
set area_id = p.area_id
from projects p
where r.linked_type = 'project'
  and r.linked_id = p.id
  and r.area_id is null;
