const TILES = [
  { icon: "📁", label: "My Resumes" },
  // Added back Sep 2026 (marketing-copy audit): CAREER_LOOP_ENABLED flipped
  // to "true" in production (wrangler.jsonc) since this tile was pulled —
  // the "Full Circle" per-resume progress badge (ResumeLoopBadge.tsx) is
  // live today, and FullCircle.tsx elsewhere on this same page already
  // markets it as shipped. Leaving this tile out any longer would have been
  // the actual accuracy problem — a real, currently-marketed feature
  // missing from the one dashboard preview it belongs in.
  { icon: "🔄", label: "Career Circle Progress" },
  { icon: "📊", label: "Resume Analytics" },
  { icon: "🔗", label: "Shared Links" },
  { icon: "👀", label: "Resume Views" },
  { icon: "💪", label: "Profile Strength Score" },
  { icon: "💡", label: "Suggested Improvements" },
  { icon: "🧳", label: "Job Search Resources" },
  { icon: "📝", label: "Resume Tips" },
  { icon: "📰", label: "Career Articles" },
  { icon: "🌟", label: "Success Stories" },
  { icon: "⚙️", label: "Subscription Management" },
];

export function DashboardPreview() {
  return (
    <section id="dashboard" className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Account dashboard</span>
          <h2>Everything lives on one dashboard</h2>
          <p>After login, subscribers land here: their whole career story at a glance.</p>
        </div>
        <div className="dashboard-grid">
          {TILES.map((tile) => (
            <div className="dash-tile" key={tile.label}>
              <div className="dash-icon">{tile.icon}</div>
              <p>{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
