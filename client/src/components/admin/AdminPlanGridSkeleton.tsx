import { Skeleton } from "../common/Skeleton";

/** Mirrors AdminPlansPage's three-card .admin-plan-grid (Starter/Professional/Premium) while plans are loading. */
export function AdminPlanGridSkeleton() {
  return (
    <div className="admin-plan-grid">
      {[0, 1, 2].map((i) => (
        <div className="admin-plan-card" key={i}>
          <Skeleton width={90} height={13} radius={4} style={{ marginBottom: 16 }} />
          {[0, 1, 2].map((j) => (
            <div key={j} style={{ marginBottom: 14 }}>
              <Skeleton width="55%" height={13} radius={4} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={38} radius={10} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
