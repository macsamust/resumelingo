const TILES = [
  { icon: "📁", label: "My Resumes" },
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
          <p>After login, subscribers land here — their whole career story at a glance.</p>
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
