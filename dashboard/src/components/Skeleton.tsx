export function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton skeleton-text-sm" />
      <div className="skeleton skeleton-text-lg" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="skeleton skeleton-text-sm" style={{ width: 140 }} />
          <div className="skeleton skeleton-text-xs" style={{ width: 200, marginTop: 8 }} />
        </div>
      </div>
      <div className="skeleton skeleton-chart" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="skeleton skeleton-text-sm" style={{ width: 160 }} />
      </div>
      <div style={{ padding: "0 20px 20px" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <>
      <div className="page-header">
        <div className="skeleton skeleton-text-lg" style={{ width: 250 }} />
        <div className="skeleton skeleton-text-xs" style={{ width: 350, marginTop: 12 }} />
      </div>
      <div className="stats-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={8} />
    </>
  );
}
