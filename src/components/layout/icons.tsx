type IconProps = { className?: string };

const base = "h-3.5 w-3.5 shrink-0";

export function TodayIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h10M3 8h10M3 12h7" />
    </svg>
  );
}

export function CalendarIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" />
    </svg>
  );
}

export function InboxIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5h3l1.2 2h2.6l1.2-2h3" />
      <path d="M2.5 8.5 3.6 3h8.8l1.1 5.5v4A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5z" />
    </svg>
  );
}

export function WaitingIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3l2 1.5" />
    </svg>
  );
}

export function ReviewIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

export function ForgottenIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="3" rx="0.8" />
      <path d="M3 6.5V12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6.5" />
      <path d="M6.5 9h3" />
    </svg>
  );
}

export function CompletedIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  );
}

export function SettingsIcon({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 2.2v1.6M8 12.2v1.6M13.8 8h-1.6M3.8 8H2.2M12 4l-1.1 1.1M5.1 10.9 4 12M12 12l-1.1-1.1M5.1 5.1 4 4" />
    </svg>
  );
}
