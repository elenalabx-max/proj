import { RRule, type Weekday } from "rrule";
import type { RecurrenceInstance, Task } from "./types";

// weekdays 用 0=一 ... 6=日（跟 lib/date.ts 的 WEEKDAY_LABELS_MON_FIRST 對齊）
const WEEKDAY_CONST: Weekday[] = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];
export const WEEKDAY_ZH = ["一", "二", "三", "四", "五", "六", "日"];

export type RecurrencePattern =
  | { freq: "daily"; interval?: number }
  | { freq: "weekly"; interval?: number; weekdays: number[] }
  | { freq: "monthly"; interval?: number; day: number }
  | { freq: "yearly"; interval?: number };

export function buildRRuleText(pattern: RecurrencePattern): string {
  const interval = pattern.interval ?? 1;
  let rule: RRule;
  switch (pattern.freq) {
    case "daily":
      rule = new RRule({ freq: RRule.DAILY, interval });
      break;
    case "weekly":
      rule = new RRule({
        freq: RRule.WEEKLY,
        interval,
        byweekday: pattern.weekdays.map((d) => WEEKDAY_CONST[d]),
      });
      break;
    case "monthly":
      rule = new RRule({ freq: RRule.MONTHLY, interval, bymonthday: [pattern.day] });
      break;
    case "yearly":
      rule = new RRule({ freq: RRule.YEARLY, interval });
      break;
  }
  // new RRule() 沒給 dtstart 時 toString() 只會輸出 "RRULE:...", 不含 DTSTART 那行
  // (DTSTART 我們另外存在 recurrence_rules.starts_on)。
  return rule.toString();
}

export function describeRRuleText(rruleText: string): string {
  try {
    const opts = RRule.parseString(rruleText);
    const interval = opts.interval ?? 1;
    const prefix = interval > 1 ? `每 ${interval} ` : "每";
    switch (opts.freq) {
      case RRule.DAILY:
        return `${prefix}天`;
      case RRule.WEEKLY: {
        const raw = opts.byweekday ?? [];
        const list = Array.isArray(raw) ? raw : [raw];
        const days = list
          .map((w) => (typeof w === "number" ? w : typeof w === "string" ? undefined : w.weekday))
          .filter((idx): idx is number => typeof idx === "number")
          .map((idx) => WEEKDAY_ZH[idx])
          .join("、");
        return `${prefix}週${days ? ` 星期${days}` : ""}`;
      }
      case RRule.MONTHLY: {
        const day = Array.isArray(opts.bymonthday) ? opts.bymonthday[0] : opts.bymonthday;
        return `${prefix}月${day ? ` ${day} 日` : ""}`;
      }
      case RRule.YEARLY:
        return `${prefix}年`;
      default:
        return "重複";
    }
  } catch {
    return "重複";
  }
}

function dateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function isoFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// 在 [rangeStart, rangeEnd]（含頭尾）範圍內展開這條規則的所有發生日期。
export function getOccurrenceDates(
  rruleText: string,
  startsOn: string,
  endsOn: string | null | undefined,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const dtstart = dateFromISO(startsOn);
  const options = RRule.parseString(rruleText);
  const rule = new RRule({
    ...options,
    dtstart,
    until: endsOn ? dateFromISO(endsOn) : options.until ?? null,
  });
  const after = dateFromISO(rangeStart);
  const before = dateFromISO(rangeEnd);
  return rule.between(after, before, true).map(isoFromDate);
}

export type Occurrence = {
  id: string;
  date: string;
  title: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  is_all_day: boolean;
  completed: boolean;
  masterTask: Task;
};

// 把某個 Task 的多個發生日期，套上 recurrence_instances 裡的例外（完成/改內容/取消），
// 產生實際要畫在畫面上的 occurrence 清單。是否取消(is_cancelled)已經先被濾掉了。
export function buildOccurrences(task: Task, dates: string[], instances: RecurrenceInstance[]): Occurrence[] {
  return dates
    .map((date) => {
      const inst = instances.find((i) => i.instance_date === date);
      if (inst?.is_cancelled) return null;
      return {
        id: `${task.id}:${date}`,
        date,
        title: inst?.override_title ?? task.title,
        scheduled_start: inst?.override_scheduled_start ?? task.scheduled_start,
        scheduled_end: inst?.override_scheduled_end ?? task.scheduled_end,
        is_all_day: task.is_all_day,
        completed: !!inst?.completed_at,
        masterTask: task,
      };
    })
    .filter((o): o is Occurrence => o !== null);
}
