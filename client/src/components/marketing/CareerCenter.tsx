const RESOURCES = [
  { tag: "Resume tips", title: "Profession-aligned advice", body: "Guidance on what to highlight, written for your specific field." },
  { tag: "Interview tips", title: "Interview prep", body: "What to expect and how to answer, by role and industry." },
  { tag: "Compensation", title: "Salary negotiation", body: "Practical guidance for negotiating pay and benefits with confidence." },
  { tag: "Career advice", title: "Career planning", body: "Advice on promotions, career pivots, and long-term planning." },
  { tag: "Networking", title: "Networking & recruiters", body: "How to build relationships with recruiters and grow your network." },
  { tag: "Industry news", title: "Stay current", body: "Curated industry news relevant to your profession." },
  { tag: "Formatting", title: "Formatting tips", body: "Best practices for each template so your resume reads cleanly." },
  { tag: "Career sites", title: "Curated job boards", body: "A running list of career sites worth checking for your industry." },
];

export function CareerCenter() {
  return (
    <section id="resources" className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Career Center</span>
          <h2>Support built into every subscription</h2>
          <p>Log in to your dashboard for guidance tailored to your profession.</p>
        </div>
        <div className="resources-grid">
          {RESOURCES.map((r) => (
            <div className="resource-card" key={r.title}>
              <span className="resource-tag">{r.tag}</span>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
