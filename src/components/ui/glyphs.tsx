// Todo／Reminder 在 Week/Month 這種小格子裡跟 Task 的純色點放在一起时，
// 光靠顏色分不出種類，所以額外給個小圖示區分（跟 Today 頁面用的圖案一致）。
type GlyphProps = { className?: string; style?: React.CSSProperties };

export function TodoDotIcon({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="10" height="10" rx="2" />
      <path d="M5.5 8.2 7.2 10 10.5 6.2" />
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
