import { Link } from "react-router-dom";

export function CTA() {
  return (
    <section>
      <div className="wrap">
        <div className="cta-band">
          <h2>Your resume deserves to be a living career profile — not a static document.</h2>
          <p>Answer a few questions, let AI write it, and share your ResumeLingo link today.</p>
          <div className="cta-actions">
            <Link to="/signup" className="btn btn-light">
              Create your ResumeLingo — free
            </Link>
            <a href="#pricing" className="btn btn-ghost" style={{ borderColor: "rgba(255,255,255,.3)", color: "#fff" }}>
              View pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
