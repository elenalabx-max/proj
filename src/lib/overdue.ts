import type { Task, Todo } from "./types";

const EXEMPT_STATUSES = new Set(["completed", "forgotten", "waiting"]);

// 逾期未完成的（過了 Due Date，或排定日期已經是過去式）算「自動遺忘」的一種
// ——不用使用者手動勾選遺忘，Forgotten 頁面會直接把這種也列進去（跟真的手動設定
// forgotten_until 的東西一起顯示，用不同標籤區分）。
//
// 用「日期」比對，不用「精確時間」比對：今天 14:00-16:00 的任務，過了 16:00
// 但還是今天，不算逾期；要跨過 0 點、變成昨天的事，才算逾期。
export function isTaskOverdue(task: Task): boolean {
  if (EXEMPT_STATUSES.has(task.status)) return false;
  const today = new Date().toISOString().slice(0, 10);

  if (task.due_date && task.due_date < today) return true;
  if (task.scheduled_date && task.scheduled_date < today) return true;
  return false;
}

export function isTodoOverdue(todo: Pick<Todo, "date" | "completed_at" | "forgotten_until">): boolean {
  if (todo.completed_at) return false;
  if (todo.forgotten_until) return false; // 已經手動遺忘的不用再算自動遺忘一次
  if (!todo.date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return todo.date < today;
}
