-- ============================================================
-- 0007_project_category_owner.sql
-- Project 補「類別」「業主」兩個自由文字欄位（沒有固定分類表，就跟 Notion
-- 截圖裡的欄位一樣簡單）。start_date/due_date（執行期間）0001 就有了，
-- 只是 UI 沒接。
-- ============================================================

alter table projects
  add column category text,
  add column owner text;
