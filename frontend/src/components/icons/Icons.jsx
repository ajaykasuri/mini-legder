// Hand-authored SVG icons, kept intentionally simple (1.5px stroke, 24x24
// grid) so they sit quietly next to Lucide icons used elsewhere without
// clashing. currentColor lets each icon inherit text color from its parent.

export function LogoMark({ size = 28 }) {
  // The "signature" mark: an open ledger book with a ruled line and a
  // rupee tick, standing in for the brand instead of a generic wallet icon.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 7C4 5.9 4.9 5 6 5H15V26H6C4.9 26 4 25.1 4 24V7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M28 7C28 5.9 27.1 5 26 5H17V26H26C27.1 26 28 25.1 28 24V7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7 11H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 2.4" />
      <path d="M7 15H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 2.4" />
      <path d="M20 11H25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 2.4" />
      <path d="M20 15H25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1 2.4" />
    </svg>
  );
}

export function IconDashboard(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconTransactions(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 7H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 17H14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconBudget(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5A8.5 8.5 0 0120.5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconSun(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5V4.5M12 19.5V21.5M21.5 12H19.5M4.5 12H2.5M18.4 5.6L17 7M7 17L5.6 18.4M18.4 18.4L17 17M7 7L5.6 5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M20 14.2A8.5 8.5 0 119.8 4a6.7 6.7 0 0010.2 10.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPlus(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M5 7H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 7V4.8C9 4.4 9.4 4 9.8 4H14.2C14.6 4 15 4.4 15 4.8V7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 7L7.8 19.2C7.8 19.6 8.2 20 8.6 20H15.4C15.8 20 16.2 19.6 16.2 19.2L17 7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconEdit(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M15.2 4.8L19.2 8.8M4 20L4.7 16.5C4.8 16.1 5 15.7 5.3 15.4L14.6 6.1C15 5.7 15.6 5.7 16 6.1L17.9 8C18.3 8.4 18.3 9 17.9 9.4L8.6 18.7C8.3 19 7.9 19.2 7.5 19.3L4 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 4V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 10.5L12 15.5L17 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconLock(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11V7.5C8 5 9.8 3.5 12 3.5C14.2 3.5 16 5 16 7.5V11" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="15.2" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M9 4H6.5C5.7 4 5 4.7 5 5.5V18.5C5 19.3 5.7 20 6.5 20H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 8L17 12L13 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 12H9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Empty-state illustration: a blank ledger page with a dashed line,
// used whenever a list has no rows yet.
export function EmptyLedgerIllustration() {
  return (
    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="10" width="100" height="100" rx="8" fill="var(--color-surface-alt)" stroke="var(--color-border)" strokeWidth="1.5" />
      <path d="M38 34H102" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M38 54H102" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M38 74H102" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M38 94H80" stroke="var(--color-border)" strokeWidth="1.5" strokeDasharray="3 4" />
      <circle cx="96" cy="94" r="9" fill="var(--color-emerald-soft)" stroke="var(--color-emerald)" strokeWidth="1.4" />
      <path d="M92.5 94H99.5M96 90.5V97.5" stroke="var(--color-emerald)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
