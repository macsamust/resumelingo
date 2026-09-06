const FEATURES = [
  { icon: "🧭", title: "Profession aware interview", body: "Select your profession and the questionnaire adapts: Software Engineer, Nurse, Teacher, Executive, Sales, and more each get a completely different question set." },
  { icon: "🤖", title: "AI Resume Generator", body: "Turns your answers into a professional summary, achievement driven bullets, skills, certifications, and a leadership summary. No writing required." },
  { icon: "🎨", title: "15+ professional templates", body: "Executive, Modern, Government, Federal, Technical, Military Transition, Healthcare, Academic, and more. Preview instantly, no rebuilding." },
  { icon: "👁️", title: "Live preview", body: "Every change instantly updates across PDF, website, printable resume, and mobile view." },
  { icon: "📄", title: "Multiple resume versions", body: "Clone your resume instead of rewriting it: a Cloud Architect version, a Program Manager version, a Solutions Architect version, each with its own summary and keywords." },
  { icon: "🔒", title: "Public or private sharing", body: "Set links public, password protected, recruiter only, or one time use, with optional expiration dates." },
  // "trend over time" was previously an unqualified promise here, but the
  // view-count is the only part every plan actually gets — the trend
  // chart/score history is Premium-only (DashboardController.buildResumeAnalytics).
  // Rephrased (Sep 2026 QA pass) so this card doesn't promise something a
  // Starter or Professional account can't see. See TODO.md's "Professional
  // ATS/analytics" entry.
  { icon: "📊", title: "Resume analytics", body: "See how your resume is performing with a running view count on every plan — Premium adds trend charts and score history over time." },
  // Previously promised unqualified — ATS Check is Premium-only (kept that
  // way on purpose, Sep 2026 QA pass; see TODO.md's "Professional
  // ATS/analytics" entry), so a Starter/Professional visitor who signed up
  // on this line's strength would find nothing behind it.
  { icon: "✅", title: "Resume Health Score & ATS optimization (Premium)", body: "Premium unlocks a Health Score, flags for missing metrics or weak summaries, and keyword recommendations scanned against real job titles." },
  { icon: "📚", title: "Career Center", body: "Resume tips, interview tips, salary negotiation, and success stories, all tailored to your profession, right on your dashboard." },
];

export function Features() {
  return (
    <section id="features" className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Features</span>
          <h2>Everything you need for a resume that lives online</h2>
          <p>Built for people who want their resume to be as easy to update as it is to share.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
