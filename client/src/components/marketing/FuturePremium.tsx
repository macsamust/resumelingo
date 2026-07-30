const FUTURE = [
  { tag: "Portfolio", title: "Career Portfolio", body: "Showcase projects, videos, awards, certifications, patents, publications, recommendations, and volunteer work." },
  { tag: "References", title: "Professional references", body: "Kept private and revealed only when requested." },
  { tag: "Networking", title: "Digital business card", body: "Scan a QR code for instant access to your resume." },
  { tag: "Video", title: "Video introduction", body: "A one-minute video introduction — recruiters love this." },
  { tag: "AI", title: "AI Career Coach", body: 'Ask "What salary should I ask for?" or "How do I answer this interview question?" and get tailored answers.' },
  { tag: "Recruiting", title: "Recruiter Mode", body: "Recruiters see a candidate summary — skills, availability, clearance, location, work authorization, expected salary, and remote preferences." },
];

export function FuturePremium() {
  return (
    <section className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">On the roadmap</span>
          <h2>What's coming to Premium</h2>
          <p>We're building toward a complete professional identity platform.</p>
        </div>
        <div className="resources-grid">
          {FUTURE.map((f) => (
            <div className="resource-card" key={f.title}>
              <span className="future-soon">Coming soon</span>
              <span className="resource-tag">{f.tag}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
