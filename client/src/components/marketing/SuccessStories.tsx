const STORIES = [
  { initial: "C", quote: "I landed a Senior Engineer position within weeks of sharing my Websume link.", name: "Chris R.", role: "Senior Engineer" },
  { initial: "P", quote: "Switching templates and tightening my bullets with the AI generator helped me increase my salary by $28,000.", name: "Priya M.", role: "Program Manager" },
  { initial: "S", quote: "I used Websume to reposition my experience and successfully switched careers into tech.", name: "Sam T.", role: "Cloud Architect" },
];

export function SuccessStories() {
  return (
    <section id="stories" className="stories-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Success stories</span>
          <h2>Subscribers who put their Websume to work</h2>
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
