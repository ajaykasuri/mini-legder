// SVG-based skeleton loader, used instead of a spinner per the spec.
// A single shimmering rect is reused so different shapes (cards, rows,
// bars) all share one animation definition instead of duplicating CSS.
export default function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  return (
    <svg width={width} height={height} style={{ display: 'block', ...style }}>
      <defs>
        <linearGradient id="skeleton-shimmer" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="var(--color-surface-alt)" />
          <stop offset="50%" stopColor="var(--color-border)" />
          <stop offset="100%" stopColor="var(--color-surface-alt)" />
          <animate attributeName="x1" values="-1;1" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="x2" values="0;2" dur="1.4s" repeatCount="indefinite" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx={radius} fill="url(#skeleton-shimmer)" />
    </svg>
  );
}

export function SummaryCardSkeleton() {
  return (
    <div className="card summary-card">
      <Skeleton width={90} height={12} style={{ marginBottom: 12 }} />
      <Skeleton width={120} height={24} />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="tx-row tx-row-skeleton">
      <Skeleton width={70} height={12} />
      <Skeleton width={100} height={12} />
      <Skeleton width={140} height={12} />
      <Skeleton width={80} height={12} />
    </div>
  );
}
