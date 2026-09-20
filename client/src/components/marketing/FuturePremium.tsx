// AI Career Coach, Recruiter Mode, Professional References, and the Digital
// business card (QR code) have all shipped (see CareerCoachPage.tsx,
// ResumeEditPage.tsx's "Recruiter Mode" section, its "References" section/
// ReferencesEditor.tsx, and ResumeQrCode.tsx — the QR feature landed the
// same month this "coming soon" entry was caught still advertising it as
// future, Sep 2026 UX review, UX-11) — removed from this "coming soon" list
// accordingly.
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
//
// "Video introduction" (a one-minute video intro subscribers could attach)
// sat here too, and was the last remaining roadmap card. Pulled Sep 2026 —
// CJ's call: video/large-file hosting isn't aligned with keeping this app
// lean, and a video intro wouldn't move overall product impact enough to
// justify taking on that storage/moderation surface. Same underlying
// principle as the Career Portfolio removal above (this app doesn't want
// to become a media-hosting product) — see TODO.md's "no heavy media
// storage" working agreement.
const FUTURE: { tag: string; title: string; body: string }[] = [];

export function FuturePremium() {
  // Nothing on the roadmap right now (see above) — render nothing rather
  // than an empty "What's coming to Premium" section with no cards under
  // it. Add a real FUTURE entry when there's a genuine next roadmap item,
  // and this section comes back automatically.
  if (FUTURE.length === 0) return null;

  return (
    <section className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">On the roadmap</span>
          <h2>What's coming to Premium</h2>
          <p>We're building toward a complete professional identity platform.</p>
        </div>
        {/* .future-grid uses auto-fit instead of a fixed column count so this
            stays correctly centered regardless of how many cards FUTURE
            holds — see that CSS rule's own comment in global.css. */}
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
