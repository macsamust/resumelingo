import { Link } from "react-router-dom";

export function CTA() {
  return (
    <section>
      <div className="wrap">
        <div className="cta-band">
          <h2>Your resume deserves to be a living career profile, not a static document.</h2>
          <p>Answer a few questions, let AI write it, and share your resume link today.</p>
          <div className="cta-actions">
            <Link to="/signup" className="btn btn-light">
              Create your resume, free
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
