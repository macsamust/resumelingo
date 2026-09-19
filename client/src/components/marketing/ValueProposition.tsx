// Sep 2026 QA pass (UX-03): these three cards previously showed URL
// patterns (resumelingo.com/john-smith, /racheljohnson/projectmanager,
// /profile/8A62FD) that don't match anything the live product actually
// generates — every real link is resumelingo.com/r/{slug} (see
// ResumeRepository's slugify/generateBrandedSlug), and "one time" links
// don't exist at all. Rewritten to the three real visibility modes
// (Public, a second branded slug per cloned version, Password protected)
// with a URL shape that matches what a subscriber will actually see.
export function ValueProposition() {
  return (
    <section id="value">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Why ResumeLingo</span>
          <h2>Stop emailing five versions of the same resume</h2>
          <p>Every subscriber gets a clean, permanent URL to share instead, and it's always the latest version.</p>
        </div>
        <div className="link-grid">
          <div className="link-card">
            <span className="link-tag">Public link</span>
            <p className="link-url">resumelingo.com/r/jordan-lee</p>
            <p className="link-desc">A clean, permanent URL anyone can view, perfect for a signature, LinkedIn, or a business card.</p>
          </div>
          <div className="link-card">
            <span className="link-tag">One link per version</span>
            <p className="link-url">resumelingo.com/r/jordan-lee-project-manager</p>
            <p className="link-desc">Clone your resume for a different role, and the new version gets its own link, tailored and separately shareable.</p>
          </div>
          <div className="link-card">
            <span className="link-tag">Password protected link</span>
            <p className="link-url">resumelingo.com/r/jordan-lee-confidential</p>
            <p className="link-desc">Set a password (with an optional expiration date), so the link only opens for people you've shared it with directly.</p>
          </div>
        </div>
        <p className="value-note">Update your resume once, and everyone who has the link automatically sees the latest version.</p>
      </div>
    </section>
  );
}
