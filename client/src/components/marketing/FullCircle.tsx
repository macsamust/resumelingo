import { Link } from "react-router-dom";

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
 *
 * Stays a short teaser, same as CareerCenter.tsx's homepage section — the
 * fuller explanation of each stage, with direct links into the actual
 * tools, lives at FullCirclePage.tsx (linked from the top nav and this
 * section's own CTA below), not duplicated here.
 */
const STAGES = [
  {
    label: "Apply",
    body: "Guided, profession-specific questions build an ATS-safe resume with AI-drafted bullets. Log every application in the Job Tracker.",
  },
  {
    label: "Interview",
    body: "The AI Career Coach preps you on interview questions and salary negotiation. Walk in with a tailored Cover Letter as your bio and table-setter.",
  },
  {
    label: "Get hired",
    body: "Send a Thank-You Letter the same day to close the loop. Your resume lives at one shareable link, not a PDF re-attached every time.",
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
            <div
              className={`circle-card${i === STAGES.length - 1 ? " circle-card-current" : ""}${
                i < STAGES.length - 1 ? " circle-card-arrow" : ""
              }`}
              key={stage.label}
            >
              <div className="circle-num">{i + 1}</div>
              <h3>{stage.label}</h3>
              <p>{stage.body}</p>
            </div>
          ))}
        </div>
        {/* Makes "the loop starts again" (stage 4's own copy, above) a visual
            fact rather than only a sentence — the sequential arrows between
            cards show the path forward, this closes it. Its own element
            rather than an arrow drawn from card 4 back to card 1, which
            would need exact pixel positions that break the moment the grid
            reflows to 2 or 1 columns on a narrower screen (see the
            circle-grid media queries) — this reads the same at every width. */}
        <div className="circle-loop-back">
          <span className="circle-loop-icon" aria-hidden="true">
            ↺
          </span>
          <span>...and the circle starts again.</span>
        </div>
        <div className="career-teaser-cta">
          <Link to="/full-circle" className="btn btn-primary">
            See how each stage works
          </Link>
        </div>
      </div>
    </section>
  );
}
