/**
 * The homepage's "full-circle career platform" hook — sits directly below
 * Hero so the positioning lands before a visitor scrolls past it, not
 * buried under HowItWorks (which is specifically about resume-building
 * mechanics) or Features further down. Mirrors the same four-stage diagram
 * built for the Overview deck (see MarketingCampaign/ResumeLingo_Overview.pptx,
 * slide 3) so the pitch reads identically whether someone sees it on the
 * site or in a partnership deck. Each stage names a real, shipped feature
 * rather than a vague promise — Job Tracker, AI Career Coach, Cover/
 * Thank-You Letters, and the resume-refresh nudge — so it never overclaims
 * past what the product actually does.
 */
const STAGES = [
  {
    label: "Apply",
    body: "Guided, profession-specific questions build an ATS-safe resume with AI-drafted bullets. Log every application in the Job Tracker.",
  },
  {
    label: "Interview",
    body: "The AI Career Coach preps you on interview questions and salary negotiation. Send a Thank-You Letter the same day.",
  },
  {
    label: "Get hired",
    body: "A tailored Cover Letter closes the loop. Your resume lives at one shareable link, not a PDF re-attached every time.",
  },
  {
    label: "Stay current",
    body: "ResumeLingo nudges you to keep your resume fresh, so you're always ready for what's next. The loop starts again.",
  },
];

export function FullCircle() {
  return (
    <section id="full-circle" className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">The full circle</span>
          <h2>One platform for the whole career, not just the resume</h2>
          <p>ResumeLingo carries you from your first application to your next promotion, not four separate tools stitched together.</p>
        </div>
        <div className="circle-grid">
          {STAGES.map((stage, i) => (
            <div className={`circle-card${i === STAGES.length - 1 ? " circle-card-current" : ""}`} key={stage.label}>
              <div className="circle-num">{i + 1}</div>
              <h3>{stage.label}</h3>
              <p>{stage.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
