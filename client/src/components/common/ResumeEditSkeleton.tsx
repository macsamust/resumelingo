import { Skeleton } from "./Skeleton";

/**
 * Shown in place of ResumeEditPage's content while the resume is loading,
 * mirroring its two-column .builder-grid layout (form panel + preview
 * panel) instead of a plain "Loading resume…" spinner.
 */
export function ResumeEditSkeleton() {
  return (
    <>
      <div className="app-page-head">
        <Skeleton width={160} height={26} radius={6} />
        <div style={{ display: "flex", gap: 10 }}>
          <Skeleton width={100} height={38} radius={999} />
          <Skeleton width={80} height={38} radius={999} />
        </div>
      </div>
      <div className="builder-grid">
        <div className="builder-panel">
          <Skeleton width="100%" height={44} radius={999} style={{ marginBottom: 20 }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <Skeleton width="40%" height={16} radius={4} style={{ marginBottom: 10 }} />
              <Skeleton width="100%" height={44} radius={10} />
            </div>
          ))}
        </div>
        <div className="builder-panel">
          <Skeleton width="60%" height={20} radius={4} style={{ marginBottom: 20 }} />
          <Skeleton width="80%" height={22} radius={4} style={{ marginBottom: 10 }} />
          <Skeleton width="50%" height={14} radius={4} style={{ marginBottom: 24 }} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={13} radius={4} style={{ marginBottom: 10 }} />
          ))}
        </div>
      </div>
    </>
  );
}
