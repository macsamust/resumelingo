export function ValueProposition() {
  return (
    <section id="value">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Why ResumeLingo</span>
          <h2>Stop emailing five versions of the same resume</h2>
          <p>Every subscriber gets a clean, permanent URL to share instead — and it's always the latest version.</p>
        </div>
        <div className="link-grid">
          <div className="link-card">
            <span className="link-tag">Public link</span>
            <p className="link-url">resumelingo.com/john-smith</p>
            <p className="link-desc">A clean, personal URL anyone can view — perfect for a signature, LinkedIn, or a business card.</p>
          </div>
          <div className="link-card">
            <span className="link-tag">Role-specific link</span>
            <p className="link-url">resumelingo.com/racheljohnson/projectmanager</p>
            <p className="link-desc">Point recruiters straight to the resume version tailored to the role you're targeting.</p>
          </div>
          <div className="link-card">
            <span className="link-tag">Private secure link</span>
            <p className="link-url">resumelingo.com/profile/8A62FD</p>
            <p className="link-desc">A password-protected or one-time link shared only with the people you choose.</p>
          </div>
        </div>
        <p className="value-note">Update your ResumeLingo once, and everyone who has the link automatically sees the latest version.</p>
      </div>
    </section>
  );
}
