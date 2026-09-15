const TILES = [
  { icon: "📁", label: "My Resumes" },
  // Ties this preview grid back to the "full circle" positioning (see
  // FullCircle.tsx below on the page) with a real, shipped dashboard
  // element (ResumeLoopBadge.tsx) rather than only describing the idea in
  // marketing copy. NOTE: this is currently gated behind CAREER_LOOP_ENABLED
  // (see worker/wrangler.jsonc), which is "false" in production as of this
  // writing — advertising it here on the always-live homepage is a
  // deliberate bet ahead of turning the flag on, not a mistake. Pull this
  // tile if the flag stays off for a while longer than expected.
  { icon: "🔁", label: "Career Circle Progress" },
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
