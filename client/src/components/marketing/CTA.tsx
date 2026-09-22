import { Link } from "react-router-dom";

export function CTA() {
  return (
    <section>
      <div className="wrap">
        <div className="cta-band">
          <h2>Your resume deserves to be a living career profile, not a static document.</h2>
          <p>Answer a few questions, let Poly write it, and share your resume link today.</p>
          <div className="cta-actions">
            {/* "Start your circle" bookends the page with the same word Hero's
                circle-tag line opens it with, rather than a generic "Get
                started" — this is the last thing a visitor reads before
                signing up or bouncing. */}
            <Link to="/signup" className="btn btn-light">
              Start your circle, free
            </Link>
            <a href="#pricing" className="btn btn-ghost" style={{ borderColor: "rgba(255,255,255,.3)", color: "#fff" }}>
              View pricing
            </a>
          </div>
          <p style={{ marginTop: 20, fontSize: 14, color: "rgba(255,255,255,.75)" }}>
            Questions? Email us at{" "}
            <a href="mailto:support@resumelingo.com" style={{ color: "#fff", textDecoration: "underline" }}>
              support@resumelingo.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
