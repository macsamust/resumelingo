/**
 * Exported so the Premium dashboard's "Success Stories" section can reuse
 * this same list rather than duplicating it. Michael B. is the first real
 * subscriber quote in this list (Sep 2026) — the other two are still
 * placeholder copy pending real replacements.
 */
export const STORIES = [
  {
    initial: "M",
    quote:
      "As a recently retired career federal employee, I haven't had to update my resume in over a decade or so. This site has definitely been a godsend and effective tool to help me update/formulate my resume as I didn't quite remember where/how to even begin. It has ALL the features, bells and whistles one could ask for; 10 out of 10!",
    name: "Michael B.",
    role: "IT Specialist",
  },
  { initial: "P", quote: "Switching templates and tightening my bullets with the AI generator helped me increase my salary by $28,000.", name: "Priya M.", role: "Program Manager" },
  { initial: "S", quote: "I used ResumeLingo to reposition my experience and successfully switched careers into tech.", name: "Sam T.", role: "Cloud Architect" },
];

export function SuccessStories() {
  return (
    <section id="stories" className="stories-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Success stories</span>
          <h2>Subscribers who put their resume to work</h2>
        </div>
        <div className="stories-grid">
          {STORIES.map((s) => (
            <div className="story-card" key={s.name}>
              <p className="story-quote">"{s.quote}"</p>
              <div className="story-person">
                <div className="story-avatar">{s.initial}</div>
                <div>
                  <p>{s.name}</p>
                  <p>{s.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
