// Todo／Reminder 在 Week/Month 這種小格子裡跟 Task 的純色點放在一起时，
// 光靠顏色分不出種類，所以額外給個小圖示區分（跟 Today 頁面用的圖案一致）。
type GlyphProps = { className?: string; style?: React.CSSProperties };

export function TodoDotIcon({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5 6.5 12 13 4" />
    </svg>
  );
}

export function ReminderDotIcon({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.5a3.2 3.2 0 0 0-3.2 3.2c0 3.7-1.5 4.8-1.5 4.8h9.4s-1.5-1.1-1.5-4.8A3.2 3.2 0 0 0 8 2.5Z" />
      <path d="M6.6 12.7a1.4 1.4 0 0 0 2.8 0" />
    </svg>
  );
}

// 交辦的「我的 Follow-up」——時鐘 + 缺口箭頭，代表「晚一點回來看」，
// 跟 Reminder 的鈴鐺區分開來（Follow-up 不是提醒新事情，是回頭確認舊的）。
export function FollowUpIcon({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
      <path d="M8 5v3.3l2.3 1.3" />
      <path d="M11 1.8 13.5 3l-.6 2.8" />
    </svg>
  );
}
