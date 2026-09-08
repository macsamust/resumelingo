import { Link } from "react-router-dom";
import { PolyAvatar } from "../brand/PolyAvatar";

export function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <span className="eyebrow">Not a resume builder. A living career profile.</span>
          <h1>
            Your resume, reimagined as a <span>living, cloud hosted professional identity</span>.
          </h1>
          <p className="lead">
            ResumeLingo interviews you about your profession, uses AI to turn your answers into polished,
            achievement driven bullets, and publishes it all to one link that's always current. No more
            emailing five different PDFs.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary">
              Get started
            </Link>
            <a href="#how" className="btn btn-ghost">
              See how it works
            </a>
          </div>
          <p className="hero-note">No design skills needed · Free tier available · Cancel anytime</p>
        </div>
        <div className="hero-visual">
          {/* Poly, the ResumeLingo mascot — stands alone here with no adjacent
              brand text, so it gets a real alt/title (see PolyAvatar's
              `decorative` prop) instead of being hidden from screen readers.
              The name/backstory lives here as real, visible copy (readable
              on mobile, announced to screen readers) rather than only in the
              image's hover tooltip, which neither of those reach. Uses the
              full-body PolyAvatar rather than ParrotLogo's flat head-only
              mark — this is exactly the kind of standalone "hero" moment
              PolyAvatar was built for (see its doc comment), where the logo
              mark alone reads as sparse once it's the sole visual focus. */}
          <div className="hero-mascot">
            <PolyAvatar size={130} decorative={false} />
          </div>
          <p className="hero-mascot-caption">
            <em>Meet Poly- short for Polyglot, our resident many tongued parrot.</em>
          </p>
          <div className="browser-bar">
            <span style={{ background: "#f87171" }}></span>
            <span style={{ background: "#fbbf24" }}></span>
            <span style={{ background: "#34d399" }}></span>
            <div className="browser-url">resumelingo.com/r/jordan-lee</div>
          </div>
          <div className="resume-card">
            <div className="resume-head">
              <div>
                <h3>Jordan Lee</h3>
                <p>Senior Product Designer</p>
              </div>
              <span className="badge-live">Live</span>
            </div>
            <div className="resume-line w80"></div>
            <div className="resume-line w60"></div>
            <div className="resume-line w40"></div>
            <div className="resume-skills">
              <span>UX Research</span>
              <span>Figma</span>
              <span>Design Systems</span>
            </div>
            <div className="resume-line w80"></div>
            <div className="resume-line w60"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
