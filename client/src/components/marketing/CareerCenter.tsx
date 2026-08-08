import { Link } from "react-router-dom";

const RESOURCES = [
  { tag: "Resume tips", title: "Profession-aligned advice", body: "Guidance on what to highlight, written for your specific field.", anchor: "resume-tips" },
  { tag: "Interview tips", title: "Interview prep", body: "What to expect and how to answer, by role and industry.", anchor: "interview-tips" },
  { tag: "Compensation", title: "Salary negotiation", body: "Practical guidance for negotiating pay and benefits with confidence.", anchor: "salary-negotiation" },
  { tag: "Career advice", title: "Career & promotion advice", body: "Advice on promotions, career pivots, and long-term planning.", anchor: "career-advice" },
  { tag: "Networking", title: "Networking & recruiters", body: "How to build relationships with recruiters and grow your network.", anchor: "networking" },
  { tag: "Industry news", title: "Stay current", body: "Current hiring trends and job market news, refreshed regularly.", anchor: "industry-news" },
];

export function CareerCenter() {
  return (
    <section id="resources" className="features-bg">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">Career Center</span>
          <h2>Support built into every subscription</h2>
          <p>Resume tips, interview prep, salary negotiation, and more — free to browse, tailored once you're in your dashboard.</p>
        </div>
        <div className="resources-grid">
          {RESOURCES.map((r) => (
            <Link to={`/career-center#${r.anchor}`} className="resource-card" key={r.title}>
              <span className="resource-tag">{r.tag}</span>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </Link>
          ))}
        </div>
        <div className="career-teaser-cta">
          <Link to="/career-center" className="btn btn-primary">
            Visit the full Career Center
          </Link>
        </div>
      </div>
    </section>
  );
}
