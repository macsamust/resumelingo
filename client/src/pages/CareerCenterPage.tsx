import { Link } from "react-router-dom";
import { useHashScroll } from "../hooks/useHashScroll";
import { useAuth } from "../context/AuthContext";

interface CareerTopic {
  id: string;
  tag: string;
  title: string;
  intro: string;
  tips: string[];
  sources: { label: string; url: string }[];
}

/**
 * Content reflects 2026 hiring research (see each topic's "Read more" links
 * for the original reporting) rather than being copied verbatim from any
 * one source — tips are synthesized across multiple reputable outlets so
 * this holds up even as any single article goes stale.
 */
const TOPICS: CareerTopic[] = [
  {
    id: "resume-tips",
    tag: "01",
    title: "Resume Tips",
    intro:
      "Hiring in 2026 has shifted from \"where have you worked\" to \"what can you do, and how fast can you learn.\" The strongest resumes are clean, skills-forward, and built around measurable impact rather than a list of duties.",
    tips: [
      "Lead every bullet with a result, not a task — quantify what changed (revenue, time saved, error rate, customer satisfaction) rather than just describing what you were responsible for.",
      "Mirror the language in the job posting for your skills and tools — most applications are screened by an ATS before a human ever sees them, and exact keyword matches score higher.",
      "Use a single-column layout with standard section headings (Experience, Education, Skills) — heavily designed templates with columns, tables, or graphics often parse incorrectly in ATS software.",
      "Don't force everything onto one page if you have 5+ years of relevant experience — ATS systems score every page equally, and a cramped one-pager reads worse than a clean two-pager.",
      "Skip the purely AI-generated bullet list. Recruiters increasingly flag generic, overly-polished phrasing that isn't backed by specifics — use AI to tighten your own draft, not to write it from scratch.",
    ],
    sources: [
      { label: "2026 resumes: what employers look for — Indeed Flex", url: "https://indeedflex.com/blog/for-flexers/2026-resumes-what-employers-look-for/" },
      { label: "18 Resume Tips for 2026 — Final Round AI", url: "https://www.finalroundai.com/blog/resume-tips-2026" },
      { label: "Resume Trends 2026: What Recruiters Want — Wipperoz", url: "https://www.wipperoz.com/en/guide/resume-trends-2026" },
    ],
  },
  {
    id: "interview-tips",
    tag: "02",
    title: "Interview Tips",
    intro:
      "Interviews are leaning harder on real-time problem-solving and behavioral evidence over rehearsed answers — but the fundamentals of structuring a clear, specific answer still decide most outcomes.",
    tips: [
      "Use the STAR method (Situation, Task, Action, Result) for behavioral questions — it keeps your answer concrete instead of drifting into generalities.",
      "Prepare a 60–90 second answer to \"tell me about yourself\" using a Present → Past → Future structure — it's asked in the vast majority of interviews and sets the tone for everything after it.",
      "Have one honest, non-critical weakness ready, paired with what you're actively doing about it — a rehearsed \"I work too hard\" answer reads as evasive.",
      "First impressions form fast — many interviewers form an initial read in the first couple of minutes, so treat your opening small talk and framing as part of the interview, not a warm-up.",
      "Expect scenario-based and AI-adjacent questions (how you'd use AI tools, how you'd handle an ambiguous problem) in addition to classic behavioral prompts — prepare one story about adapting to a new tool or process.",
    ],
    sources: [
      { label: "25 Common Interview Questions & Answers — Resume-Now", url: "https://www.resume-now.com/job-resources/interviews/interview-questions-and-answers" },
      { label: "Top 10 Interview Questions and Answers — The Interview Guys", url: "https://blog.theinterviewguys.com/top-10-job-interview-questions-and-answers/" },
      { label: "Job Interview Tips and Tricks 2026 — Qwyse", url: "https://www.qwyse.com/hub/learn/job-interview-tips-and-tricks-in-2026-how-to-prepare-and-answer-to-get-hired/" },
    ],
  },
  {
    id: "salary-negotiation",
    tag: "03",
    title: "Salary Negotiation",
    intro:
      "Negotiating is expected, not confrontational — most hiring managers budget for it. The leverage you have is highest the moment an offer is made, before you've accepted anything.",
    tips: [
      "Research your number before the conversation using Glassdoor, Payscale, and LinkedIn Salary, then adjust for your metro area, years of experience, and specialized skills.",
      "Wait for the offer stage to negotiate — once an offer is on the table, the employer has already decided you're the right person for the role, which is your strongest leverage point.",
      "Make the case, don't just state the number — briefly connect your ask to specific strengths and what the employer gains from your track record.",
      "If base salary is fixed, negotiate the rest — signing bonus, extra PTO, remote/hybrid flexibility, equity, professional development budget, relocation support, or an earlier performance review all carry real value.",
      "Know your floor going in, and be willing to walk away if an offer can't meet it — a number you'll resent in six months isn't worth taking under pressure.",
    ],
    sources: [
      { label: "How To Negotiate Salary After a Job Offer — Indeed", url: "https://www.indeed.com/career-advice/pay-salary/how-to-negotiate-salary" },
      { label: "How to Negotiate Salary: 3 Winning Strategies — Harvard Law PON", url: "https://www.pon.harvard.edu/daily/salary-negotiations/negotiate-salary-3-winning-strategies/" },
      { label: "How to Negotiate Salary During Your Job Search — Robert Half", url: "https://www.roberthalf.com/us/en/insights/career-development/how-to-negotiate-salary-after-getting-job-offer" },
    ],
  },
  {
    id: "career-advice",
    tag: "04",
    title: "Career Advice",
    intro:
      "Careers are less linear than they used to be, and titles matter less than the skills and visibility you build along the way. The advice that holds up: get good, get seen, and get sponsored.",
    tips: [
      "Build the skill set of the role one level above yours — it signals readiness before a title change is even on the table.",
      "Create visibility for your work through documentation, updates, and clear communication — good work that nobody hears about doesn't move careers.",
      "Find a sponsor, not just a mentor — a mentor gives advice, but a sponsor advocates for you in rooms you're not in, which is what actually moves careers from good to exceptional.",
      "Prioritize AI fluency alongside your core craft — comfort with AI tools is quickly becoming table stakes across most professional roles, not just technical ones.",
      "Define what success means to you specifically, on your own terms, rather than defaulting to the next obvious title — it keeps you moving toward something you actually want.",
    ],
    sources: [
      { label: "101 Best Career Tips From Industry Experts — Novorésumé", url: "https://novoresume.com/career-blog/career-tips" },
      { label: "How to advance your career in 2026 — Hays", url: "https://www.hays.com.au/blog/insights/how-to-advance-your-career" },
      { label: "50 Best Pieces of Career Advice — CareerAddict", url: "https://www.careeraddict.com/career-success-tips" },
    ],
  },
  {
    id: "promotion-advice",
    tag: "05",
    title: "Promotion Advice",
    intro:
      "Promotions go to people who are already doing pieces of the next job, and who've made sure their manager knows it. Waiting quietly for recognition rarely works.",
    tips: [
      "Master your current role first — consistently excellent, on-time work in your existing job is the baseline, not a bonus, for being considered for the next one.",
      "Tie your work explicitly to business outcomes — revenue, efficiency, customer satisfaction, or cost savings are the language decision-makers respond to.",
      "Tell your manager what you want, directly and privately — ambiguity about your goals means they can't advocate for you even if they'd like to.",
      "Volunteer for stretch assignments that build visible new skills, especially ones that show you can lead or motivate others.",
      "Ask your manager for a regular, explicit check-in on what's standing between you and the next level — vague annual reviews aren't enough to course-correct in time.",
    ],
    sources: [
      { label: "How To Get Promoted at Work: 9 Effective Strategies — Indeed", url: "https://www.indeed.com/career-advice/career-development/how-to-get-promoted-at-work" },
      { label: "How to Get Promoted at Work: 11 Tips — Built In", url: "https://builtin.com/articles/how-to-get-promoted" },
      { label: "How To Get Promoted at Work: The Ultimate Guide — 300 Hours", url: "https://300hours.com/how-to-get-promoted-at-work/" },
    ],
  },
  {
    id: "career-planning",
    tag: "06",
    title: "Career Planning",
    intro:
      "Rigid 5- and 10-year plans age poorly when roles and skills shift this fast. The more durable approach is a short-horizon plan you revisit often.",
    tips: [
      "Run an honest skills audit — both technical skills and transferable ones like communication, stakeholder management, and learning agility.",
      "Define a direction for the next one to three years without needing every step mapped out — clarity of direction matters more than a rigid route.",
      "Turn that direction into a structured plan with specific goals and timelines you can actually check yourself against.",
      "Plan month to month, not just annually — a monthly cadence lets you adapt to a fast-moving job market instead of working off a plan that's stale by June.",
      "Build in time for rest and boundaries on purpose — a plan that assumes no downtime is a plan you'll abandon under the first sign of burnout.",
    ],
    sources: [
      { label: "Preparing for a Career Change: Step-by-Step Guide — Coursera", url: "https://www.coursera.org/articles/career-change" },
      { label: "Career Planning In 2026: The Complete Guide — Digital Vidya", url: "https://www.digitalvidya.com/blog/career-planning/" },
      { label: "Career Planning Guide 2026 — Dinjob", url: "https://dinjob.com/blog/article/career-planning-guide-how-to-choose-change-and-grow-your-career/" },
    ],
  },
  {
    id: "networking",
    tag: "07",
    title: "Networking",
    intro:
      "The most effective networkers treat it as an ongoing habit, not an occasional event. A little consistent effort beats an occasional big push every time.",
    tips: [
      "Combine digital and in-person — connect online first and deepen it in person, or meet in person and maintain it digitally afterward. Neither alone works as well.",
      "Optimize for quality over quantity — one connection who genuinely knows your work is worth far more than a hundred surface-level LinkedIn adds.",
      "Set specific goals for networking activity, like meeting three new contacts in your field this month, rather than treating it as a vague ongoing obligation.",
      "Practice active listening and ask genuinely curious questions — the strongest relationships form around attention, not self-promotion.",
      "Aim for short, regular engagement — roughly 30 minutes a day of intentional outreach and conversation tends to outperform an occasional multi-hour push.",
    ],
    sources: [
      { label: "6 Simple Networking Tips to Support Your Career Growth — Harvard Business School Online", url: "https://online.hbs.edu/blog/post/professional-networking-tips" },
      { label: "9 Networking Tips to Expand Your Network — Coursera", url: "https://www.coursera.org/articles/networking-tips" },
      { label: "Professional Networking Do's & Don'ts — SUCCESS", url: "https://www.success.com/importance-of-professional-networking-events" },
    ],
  },
  {
    id: "recruiters",
    tag: "08",
    title: "Recruiters",
    intro:
      "Recruiters are triaging a lot of noise. Being easy to find, easy to understand at a glance, and specific in outreach is what actually gets a response.",
    tips: [
      "Keep your LinkedIn headline specific — lead with your expertise and tools rather than just a job title, so a recruiter understands your value in one glance.",
      "Turn on \"Open to Work\" visible only to recruiters, not your full network, if you're job searching while employed — it keeps your search active without alerting your current employer's network.",
      "Skip generic outreach — mention something specific (recent company news, a hiring manager's recent post, a concrete team challenge) to show real research and interest.",
      "Ask for referrals wherever you can — recruiters and hiring managers trust a referral far more than a cold application, and it's consistently the fastest path to a first conversation.",
      "Respond quickly and professionally, even to roles that aren't a fit — recruiters remember candidates who were easy to work with for the next opportunity.",
    ],
    sources: [
      { label: "15 Expert Tips for Working with a Recruiter — TopResume", url: "https://topresume.com/career-advice/5-tips-for-effectively-working-with-a-recruiter" },
      { label: "Insider Tips to Find and Connect With Recruiters — Boston University Questrom", url: "https://questromfeld.bu.edu/blog/2026/03/12/insider-tips-to-find-and-connect-with-recruiters/" },
      { label: "How to Get Recruiters to Notice You — Scope Recruiting", url: "https://www.scoperecruiting.com/blog/how-to-actually-get-recruiters-to-notice-you" },
    ],
  },
  {
    id: "industry-news",
    tag: "09",
    title: "Industry News",
    intro:
      "The job market is shifting from the strongly candidate-driven conditions of the past few years toward a more balanced, more AI-influenced hiring process.",
    tips: [
      "Expect a more competitive market — a majority of surveyed economists project the job market to cool further, after several years favoring job seekers.",
      "AI is now standard in recruiting — the large majority of companies use AI somewhere in their hiring process, from resume screening to video interview analysis, up sharply from just a couple years ago.",
      "Entry-level hiring is under particular pressure — recent graduate unemployment has been running above the national average, and a meaningful share of postings are inactive \"ghost jobs,\" so treat any single rejection as noisy signal, not a verdict.",
      "AI literacy is becoming a baseline expectation across industries, not just in technical roles — building even light familiarity with common AI tools in your field is worth the time.",
      "More employers are sourcing candidates through social platforms, not just traditional job boards — an active, well-kept professional profile is doing more sourcing work than it used to.",
    ],
    sources: [
      { label: "10 Trends Driving The Job Market — Forbes", url: "https://www.forbes.com/sites/bryanrobinson/2026/05/07/10-trends-driving-the-job-market-2026-graduates-need-to-know/" },
      { label: "2026 Job Outlook — NACE", url: "https://naceweb.org/research/reports/job-outlook/2026/" },
      { label: "How hiring trends are changing in 2026 — Robert Half", url: "https://www.roberthalf.com/us/en/insights/landing-job/why-hiring-trends-may-be-better-than-they-appear" },
    ],
  },
];

/** Career Center is a Professional/Premium perk — Starter ("Basic") accounts and signed-out visitors see an upgrade prompt instead of the content. */
const ALLOWED_TIERS = new Set(["professional", "premium"]);

function CareerCenterLocked({ signedIn }: { signedIn: boolean }) {
  return (
    <main className="career-page">
      <section className="career-hero">
        <div className="wrap">
          <div className="career-locked">
            <span className="section-tag">Career Center</span>
            <h1>This page is for Professional and Premium subscribers</h1>
            <p>
              {signedIn
                ? "Your current plan doesn't include the Career Center. Upgrade to Professional or Premium to unlock resume tips, interview prep, salary negotiation guidance, and more."
                : "Sign in with a Professional or Premium account to unlock resume tips, interview prep, salary negotiation guidance, and more. Starting on the free Starter plan? Upgrade any time from your dashboard."}
            </p>
            <div className="career-locked-actions">
              {signedIn ? (
                <Link to="/dashboard" className="btn btn-primary">
                  Upgrade my plan
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary">
                    Log in
                  </Link>
                  <Link to="/signup" className="btn btn-ghost">
                    Sign up
                  </Link>
                </>
              )}
              <Link to="/#pricing" className="btn btn-ghost">
                See plans & pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function CareerCenterPage() {
  // So links like /career-center#salary-negotiation (from the footer, the
  // landing page teaser, or elsewhere) land on the right section.
  useHashScroll();
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner-page">Loading…</div>;
  if (!user || !ALLOWED_TIERS.has(user.subscriptionTier)) {
    return <CareerCenterLocked signedIn={!!user} />;
  }

  return (
    <main className="career-page">
      <section className="career-hero">
        <div className="wrap">
          <div className="section-head">
            <span className="section-tag">Career Center</span>
            <h1>Everything you need between resumes and offers</h1>
            <p>
              Current, practical guidance across the whole job search and career growth journey — pulled together
              from the field's most-cited career sites and refreshed as hiring trends shift.
            </p>
          </div>
          <nav className="career-toc" aria-label="Career Center topics">
            {TOPICS.map((t) => (
              <a key={t.id} href={`#${t.id}`}>
                {t.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section>
        <div className="wrap career-sections">
          {TOPICS.map((topic) => (
            <article className="career-section" id={topic.id} key={topic.id}>
              <span className="career-section-tag">{topic.tag}</span>
              <h2>{topic.title}</h2>
              <p className="career-intro">{topic.intro}</p>
              <ul className="career-tips">
                {topic.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
              <div className="career-sources">
                <span className="career-sources-label">Read more:</span>
                {topic.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="features-bg">
        <div className="wrap career-cta">
          <h2>Ready to put this into practice?</h2>
          <p>Build a resume that reflects everything above, in minutes.</p>
          <Link to="/signup" className="btn btn-primary">
            Create your Websume
          </Link>
        </div>
      </section>
    </main>
  );
}
