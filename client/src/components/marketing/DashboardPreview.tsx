const TILES = [
  { icon: "📁", label: "My Resumes" },
  // A "Career Circle Progress" tile (ResumeLoopBadge.tsx, the real dashboard
  // feature the FullCircle.tsx section below is named after) was tried here
  // and deliberately pulled: this homepage section is always-live and
  // unflagged, but the feature itself is still behind CAREER_LOOP_ENABLED
  // ("false" in production, no target date to flip it) and hasn't been
  // validated with real usage yet. Advertising a named feature a fresh
  // signup can't actually see, with no ship date, risked eroding trust in
  // every other tile in this list that IS accurate today. Add it back once
  // the flag is on for real.
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
