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
//
// "Career Portfolio" (showcase projects/videos/awards/recommendations as a
// separate hosted page) also sat here, and was promised as a shipped
// feature on Pricing.tsx/subscriptionPlans.ts ("Portfolio pages & personal
// branding tools") despite never having been built. Pulled entirely per
// explicit product decision: a resume builder hosting portfolios, videos,
// and testimonials is a different product, with its own media-hosting and
// moderation surface, and doesn't make the actual resumes any better. See
// TODO.md.
const FUTURE = [
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
        {/* Only 2 cards since "Career Portfolio" was pulled (see the comment
            above) — the shared 4-column .resources-grid (also used by
            CareerCenter.tsx's 6-card teaser) would otherwise leave 2 cards
            stranded on the left with a lopsided gap on the right. .future-grid
            caps it to 2 centered columns instead, just for this section. */}
        <div className="resources-grid future-grid">
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
