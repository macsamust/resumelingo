// AI Career Coach, Recruiter Mode, and Professional References have all
// shipped (see CareerCoachPage.tsx, ResumeEditPage.tsx's "Recruiter Mode"
// section, and its "References" section/ReferencesEditor.tsx) — removed
// from this "coming soon" list accordingly.
//
// "Custom domain" briefly sat here after being pulled from Pricing.tsx as
// overpromised — it turned out to describe an already-shipped feature
// (ResumeRepository.generateBrandedSlug's {name}-{title} public link),
// just mislabeled, so it moved back to Pricing.tsx/subscriptionPlans.ts as
// "Branded resume link" instead. A "Your own domain" entry briefly sat
// here after that for the real, DNS-level version of the feature — pulled
// per explicit decision not to build real custom-domain hosting at all
// (no clear upside, real downsides — e.g. verifying and being responsible
// for arbitrary third-party domains/certs, and the abuse surface of
// letting anyone point a domain at hosted content). See TODO.md.
const FUTURE = [
  { tag: "Portfolio", title: "Career Portfolio", body: "Showcase projects, videos, awards, certifications, patents, publications, recommendations, and volunteer work." },
  { tag: "Networking", title: "Digital business card", body: "Scan a QR code for instant access to your resume." },
  { tag: "Video", title: "Video introduction", body: "A one-minute video introduction — recruiters love this." },
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
