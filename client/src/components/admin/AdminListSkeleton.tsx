import { Skeleton } from "../common/Skeleton";

/** Mirrors AdminRoleDescriptionsPage's card-per-row list layout while loading — reuses .builder-panel for the same white-card look as the real rows. */
export function AdminListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="builder-panel" key={i} style={{ padding: 18 }}>
          <Skeleton width="30%" height={15} radius={4} style={{ marginBottom: 12 }} />
          <Skeleton width="90%" height={13} radius={4} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={13} radius={4} />
        </div>
      ))}
    </div>
  );
}
