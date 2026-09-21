import { Link } from "react-router-dom";
import { useHashScroll } from "../hooks/useHashScroll";
import { useAuth } from "../context/AuthContext";

interface Stage {
  id: string;
  tag: string;
  label: string;
  intro: string;
  detail: string;
  /** Shown only when signed in — the actual in-app tool this stage points to. Not gated per-tier here; the tool's own page/route already enforces that (see AppShell's LINKS and each controller's own tier check), so this is just a doorway, never a promise the tool is unlocked. */
  link?: { label: string; to: string };
}

/**
 * The dedicated version of the homepage's FullCircle.tsx teaser (see that
 * component's own doc comment for why the 4-stage framing exists at all —
 * same Apply/Interview/Get hired/Stay current circle, same shipped features,
 * just with room here to actually explain each stage instead of a one-line
 * card). Linked from the top nav the same way Career Center is: a page of
 * its own, reachable from both the logged-in and logged-out nav rows (see
 * Navbar.tsx), not just a homepage anchor.
 */
const STAGES: Stage[] = [
  {
    id: "apply",
    tag: "01",
    label: "Apply",
    intro: "Build an ATS-safe resume from guided, profession-specific questions, and keep every application in one place.",
    detail:
      "Poly asks the right questions for your field, from certifications and clinical experience to CI/CD and GitHub, and drafts impact-focused bullets instead of a bare list of duties. Once you've applied, log the role, company, and status in the Job Tracker so you're never guessing what you sent where.",
    // Apply is the "build the resume" stage of the circle — the resume
    // builder, not the Job Tracker (that's the logging step described in
    // the copy above, not the doorway itself). Was pointing at
    // /job-applications, which sent people to log an application before
    // they'd necessarily built the resume to apply with. Fixed per CJ,
    // Sep 2026.
    link: { label: "New Resume", to: "/resumes/new" },
  },
  {
    id: "interview",
    tag: "02",
    label: "Interview",
    intro: "Prep with an AI Career Coach and walk in with a tailored Cover Letter as your bio and table-setter.",
    detail:
      "Ask Poly to run through likely interview questions for the role, get help structuring a STAR answer, or talk through salary negotiation before you're in the room. A Cover Letter built from your resume gives the interviewer a table-setter before you've said a word.",
    link: { label: "Ask Poly", to: "/career-coach" },
  },
  {
    id: "get-hired",
    tag: "03",
    label: "Get hired",
    intro: "Send a Thank-You Letter the same day, and keep your resume at one link instead of a re-attached PDF.",
    detail:
      "Closing the circle matters: a same-day Thank-You Letter keeps you top of mind while the interview is still fresh. And because your resume lives at one shareable link, updating it later doesn't mean tracking down every place you ever sent a PDF.",
    link: { label: "Write a Thank-You Letter", to: "/thank-you-letter" },
  },
  {
    id: "stay-current",
    tag: "04",
    label: "Stay current",
    intro: "ResumeLingo nudges you to keep your resume fresh, so you're always ready for what's next.",
    detail:
      "A resume that's accurate the day you got hired goes stale fast. We'll nudge you periodically to add a new role, a fresh achievement, or an updated title, so the next opportunity doesn't start with a scramble to rewrite everything from scratch. Then the circle starts again.",
  },
];

export function FullCirclePage() {
  // So a link like /full-circle#interview (from the footer, homepage
  // teaser, or elsewhere) lands on the right stage.
  useHashScroll();
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner-page"><div className="spinner-ring" role="status" aria-label="Loading" /></div>;

  return (
    <main className="career-page">
      <section className="career-hero">
        <div className="wrap">
          <div className="section-head">
            <span className="section-tag">The Full Circle</span>
            <h1>One platform for the whole career, not just the resume</h1>
            <p>
              ResumeLingo carries you from your first application to your next promotion, not four separate tools
              stitched together. Here's what each stage of the circle actually does.
            </p>
          </div>
          <nav className="career-toc" aria-label="Full Circle stages">
            {STAGES.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section>
        <div className="wrap career-sections">
          {STAGES.map((stage) => (
            <article className="career-section" id={stage.id} key={stage.id}>
              <span className="career-section-tag">{stage.tag}</span>
              <h2>{stage.label}</h2>
              <p className="career-intro">{stage.intro}</p>
              <p className="career-intro">{stage.detail}</p>
              {stage.link && user && (
                <Link to={stage.link.to} className="btn btn-ghost">
                  {stage.link.label}
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="features-bg">
        <div className="wrap career-cta">
          {user ? (
            <>
              <h2>Keep the circle going</h2>
              <p>Head back to your dashboard to pick up wherever you left off.</p>
              <Link to="/dashboard" className="btn btn-primary">
                Go to my dashboard
              </Link>
            </>
          ) : (
            <>
              <h2>Ready to start the circle?</h2>
              <p>Build your first resume free, and everything above comes with it.</p>
              <Link to="/signup" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
