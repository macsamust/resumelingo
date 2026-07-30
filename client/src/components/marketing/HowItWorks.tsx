const STEPS = [
  {
    title: "Choose your profession",
    body:
      "Software Engineer, Nurse, Teacher, Executive, Project Manager, Government Contractor, Military, Sales, Marketing, Construction, and more — selecting one changes the questions you're asked, from certifications and clinical experience to CI/CD and GitHub.",
  },
  {
    title: "Let AI write the resume",
    body:
      'Instead of "Managed team," Websume\'s AI generates "Led a cross-functional engineering team of twelve professionals delivering secure cloud modernization initiatives supporting Department of Defense customers" — plus your summary, skills, and achievements.',
  },
  {
    title: "Preview, publish, share",
    body:
      "Pick a template, see it update instantly across PDF, website, print, and mobile, then publish to one clean link — public, private, or password-protected.",
  },
];

export function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <div className="section-head">
          <span className="section-tag">How it works</span>
          <h2>The system interviews you — you don't write a thing</h2>
          <p>Instead of asking you to type an entire resume from scratch, Websume asks smart, profession-aware questions, then builds and hosts your resume for you.</p>
        </div>
        <div className="steps">
          {STEPS.map((step, i) => (
            <div className="step-card" key={step.title}>
              <div className="step-num">{i + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
