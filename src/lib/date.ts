import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// "今天"的日期字串——一定要用本地時區算，不要用 `new Date().toISOString().slice(0,10)`。
// 那個是 UTC 日期，台灣（UTC+8）從 00:00 到 07:59 這段時間 UTC 還停在前一天，
// 算出來的「今天」會整個錯位一天（「明天」變成「今天」、逾期判斷也會提早/延後）。
export function todayISODate(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// week_start: 0 = Sunday, 1 = Monday（來自 user_settings.week_start）
export function getMonthGridDates(reference: Date, weekStart: 0 | 1): Date[] {
  const start = startOfWeek(startOfMonth(reference), { weekStartsOn: weekStart });
  const end = endOfWeek(endOfMonth(reference), { weekStartsOn: weekStart });
  return eachDayOfInterval({ start, end });
}

export function getWeekDates(reference: Date, weekStart: 0 | 1): Date[] {
  const start = startOfWeek(reference, { weekStartsOn: weekStart });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_LABELS_MON_FIRST = ["一", "二", "三", "四", "五", "六", "日"];
export const WEEKDAY_LABELS_SUN_FIRST = ["日", "一", "二", "三", "四", "五", "六"];

export function weekdayLabels(weekStart: 0 | 1) {
  return weekStart === 1 ? WEEKDAY_LABELS_MON_FIRST : WEEKDAY_LABELS_SUN_FIRST;
}

// "HH:mm" -> 從當日 00:00 起算的分鐘數
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
