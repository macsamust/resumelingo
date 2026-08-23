// AI Career Coach, Recruiter Mode, and Professional References have all
// shipped (see CareerCoachPage.tsx, ResumeEditPage.tsx's "Recruiter Mode"
// section, and its "References" section/ReferencesEditor.tsx) — removed
// from this "coming soon" list accordingly. Custom domain was previously
// listed as a live Premium perk in Pricing.tsx/subscriptionPlans.ts, but
// there's no backing implementation (no domain field, no DNS/hostname
// verification, no routing) anywhere in worker/ — moved here instead of
// overpromising it as available today. See TODO.md's "Product review" note.
const FUTURE = [
  { tag: "Portfolio", title: "Career Portfolio", body: "Showcase projects, videos, awards, certifications, patents, publications, recommendations, and volunteer work." },
  { tag: "Networking", title: "Digital business card", body: "Scan a QR code for instant access to your resume." },
  { tag: "Video", title: "Video introduction", body: "A one-minute video introduction — recruiters love this." },
  { tag: "Branding", title: "Custom domain", body: "Host your public resume link on your own domain instead of resumelingo.com." },
];

export function FuturePremium() {
  return (
    <section className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">On the roadmap</span>
          <h2>What's coming to Premium</h2>
          <p>We're building toward a complete professional identity platform.</p>
        </div>
        <div className="resources-grid">
          {FUTURE.map((f) => (
            <div className="resource-card" key={f.title}>
              <span className="future-soon">Coming soon</span>
              <span className="resource-tag">{f.tag}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
