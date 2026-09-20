/**
 * Exported so the Premium dashboard's "Success Stories" section can reuse
 * this same list rather than duplicating it. Michael B. is the only real
 * subscriber quote here (Sep 2026). The other two entries that used to sit
 * here (Priya M., Sam T.) were placeholder copy — fabricated names, roles,
 * and a specific invented "$28,000 salary increase" figure — presented on
 * the live site as if they were real customers. Pulled entirely rather
 * than left in place (marketing-copy audit, Sep 2026): CJ is sourcing two
 * real replacement testimonials. Add them here as they come in; don't
 * refill this list with placeholder copy in the meantime.
 */
export const STORIES = [
  {
    initial: "M",
    quote:
      "As a recently retired career federal employee, I haven't had to update my resume in over a decade or so. This site has definitely been a godsend and effective tool to help me update/formulate my resume as I didn't quite remember where/how to even begin. It has ALL the features, bells and whistles one could ask for; 10 out of 10!",
    name: "Michael B.",
    role: "IT Specialist",
  },
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
