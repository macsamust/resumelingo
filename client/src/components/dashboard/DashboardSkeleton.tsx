import { Skeleton } from "../common/Skeleton";

/**
 * Shown in place of DashboardPage's content while the initial
 * /dashboard/summary request is in flight, mirroring the real layout
 * (page head, the four dash-tiles, and a few My Resumes cards) instead of
 * a generic spinner — so the page doesn't visually "jump" once real data
 * arrives, and it reads as instantly responsive rather than stalled.
 */
export function DashboardSkeleton() {
  return (
    <>
      <div className="app-page-head">
        <div>
          <Skeleton width={220} height={26} radius={6} style={{ marginBottom: 10 }} />
          <Skeleton width={80} height={13} radius={4} />
        </div>
        <Skeleton width={130} height={40} radius={999} />
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 36 }}>
        {[0, 1, 2, 3].map((i) => (
          <div className="dash-tile" key={i}>
            <Skeleton width={22} height={22} radius="50%" style={{ marginBottom: 10 }} />
            <Skeleton width="70%" height={13} radius={4} style={{ margin: "0 auto" }} />
          </div>
        ))}
      </div>

      <Skeleton width={140} height={20} radius={4} style={{ marginBottom: 16 }} />
      <div className="resume-list-grid">
        {[0, 1, 2].map((i) => (
          <div className="resume-item-card" key={i}>
            <div className="resume-item-tags">
              <Skeleton width={54} height={19} radius={999} />
              <Skeleton width={110} height={19} radius={999} />
            </div>
            <div className="resume-item-header-row">
              <Skeleton width="65%" height={17} radius={4} />
              <Skeleton width={28} height={28} radius={8} />
            </div>
            <Skeleton width="45%" height={13} radius={4} style={{ margin: "8px 0 6px" }} />
            <Skeleton width="55%" height={13} radius={4} style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <Skeleton width={70} height={28} radius={8} />
              <Skeleton width={90} height={28} radius={8} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
