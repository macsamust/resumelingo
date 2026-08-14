import { Skeleton } from "./Skeleton";

/** Shown on the public resume link (/r/:slug) while it loads — a document-shaped placeholder inside the same centered .public-resume-page column the real preview renders in. */
export function PublicResumeSkeleton() {
  return (
    <div className="public-resume-page">
      <div className="public-resume-actions">
        <Skeleton width={160} height={40} radius={999} />
        <Skeleton width={180} height={40} radius={999} />
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 40 }}>
        <Skeleton width="55%" height={28} radius={6} style={{ marginBottom: 12 }} />
        <Skeleton width="35%" height={14} radius={4} style={{ marginBottom: 28 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <Skeleton width={140} height={15} radius={4} style={{ marginBottom: 12 }} />
            <Skeleton width="100%" height={12} radius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="90%" height={12} radius={4} style={{ marginBottom: 8 }} />
            <Skeleton width="70%" height={12} radius={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
