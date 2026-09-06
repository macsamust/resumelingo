import { Link } from "react-router-dom";
import { useHashScroll } from "../hooks/useHashScroll";
import { QUICK_START_STEPS } from "../config/quickStartSteps";

/**
 * Open to everyone, including signed-out visitors — unlike CareerCenterPage,
 * this isn't a Professional/Premium perk. Uses the same prose "legal-page"
 * layout as Privacy/Terms rather than CareerCenterPage's tags-and-sources
 * card layout, since this is app-usage/support content, not cited career
 * research.
 *
 * support@resumelingo.com (referenced in the Support section below) needs
 * an actual inbox behind it before this goes live for real — see the
 * Cloudflare Email Routing rule noted in TODO.md. The copy here assumes
 * that's set up; don't publish/link this page until it actually is.
 */
const FAQ_ITEMS: { id: string; question: string; answer: JSX.Element }[] = [
  {
    id: "changes-not-showing",
    question: "I made changes to my resume but I don't see them when I view it. What happened?",
    answer: (
      <>
        <p>
          Most of the resume editor autosaves automatically: when you click or tab out of a field, it saves within a
          second or two. You'll see "All changes saved" near the top of the page when it's caught up, or "Couldn't
          autosave, click Save changes to retry" if something went wrong (usually a connection hiccup). There's also
          a "Save changes" button at the top of the editor you can click any time to save immediately, rather than
          waiting for autosave.
        </p>
        <p>
          One section works differently: the <strong>Generated Summary &amp; Bullets</strong> section has its own{" "}
          <strong>"Save summary"</strong> button, separate from the rest of the form. If you edited your summary or
          bullet text and don't see it reflected, check that you clicked "Save summary" specifically. That section
          doesn't autosave with everything else.
        </p>
        <p>
          If you edited a resume and the change still isn't showing on your public link, try a hard refresh
          (Cmd+Shift+R / Ctrl+Shift+R). Browsers sometimes cache the public resume page.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    question: "How do I share my resume with someone?",
    answer: (
      <p>
        Open the resume in the editor and go to the <strong>Sharing</strong> section. You'll find your public link
        there, which you can copy and send directly, or open in a new tab to preview exactly what a viewer will see.
      </p>
    ),
  },
  {
    id: "link-visibility",
    question: "Who can see my resume link?",
    answer: (
      <p>
        Depends on your plan and what you choose under <strong>Link visibility</strong> in the Sharing section:{" "}
        <strong>Public</strong> (anyone with the link can view it, available on every plan), <strong>Private</strong>{" "}
        (only you can view it while logged in, Professional and above), or <strong>Password protected</strong>{" "}
        (anyone with the link needs a password you set, Premium only).
      </p>
    ),
  },
  {
    id: "resume-limit",
    question: "How many resumes can I create?",
    answer: (
      <p>
        Depends on your plan. Check the <Link to="/#pricing">Pricing</Link> page for current limits. If you're at
        your limit, the "Create resume" flow will tell you before you start filling out a new one, rather than after.
      </p>
    ),
  },
  {
    id: "edit-summary",
    question: "Can I edit the AI generated summary and bullet points?",
    answer: (
      <p>
        Yes. In the <strong>Generated Summary &amp; Bullets</strong> section of the editor, both the Summary and
        Bullets fields are directly editable text: type your own version and click <strong>Save summary</strong>. If
        you'd rather have it rewritten again automatically, there's a <strong>Regenerate</strong> button in the same
        section.
      </p>
    ),
  },
  {
    id: "ats-check",
    question: "What's the ATS Check, and why can't I click on some of the suggested keywords?",
    answer: (
      <>
        <p>
          ATS Check (a Premium feature, found in the editor) scores your resume's structure against what an
          Applicant Tracking System looks for, and separately lets you paste in a job description to see which of
          its top keywords your resume already covers.
        </p>
        <p>
          For missing keywords, you'll usually see a <strong>+</strong> button that adds the word straight into your{" "}
          <strong>Skills &amp; Tools</strong> section. That button only appears on templates that actually have a
          Skills &amp; Tools section — not every template does. If you don't see it, switching to a template that
          includes Skills &amp; Tools (most do) will bring it back, or you can just add the keyword yourself
          somewhere relevant in your resume.
        </p>
      </>
    ),
  },
  {
    id: "templates",
    question: "Can I change my resume's template later, and do all templates have the same sections?",
    answer: (
      <p>
        Yes, you can switch templates any time from the editor and the preview updates instantly, so you can see
        exactly what changes before committing. Not every template looks or behaves identically though: a few, like
        photo-based templates, show an uploaded photo, and only some include a dedicated Skills &amp; Tools
        section. If a section you rely on seems to disappear after switching templates, check the live preview;
        that's usually why.
      </p>
    ),
  },
  {
    id: "import-resume",
    question: "Can I import an existing resume instead of starting from scratch?",
    answer: (
      <p>
        Yes, on Professional and Premium plans. When starting a new resume, choose{" "}
        <strong>Import an existing resume</strong> and upload your current PDF or Word document. We'll read it and
        pre-fill your experience, education, and other sections for you, review and adjust anything before saving.
      </p>
    ),
  },
  {
    id: "job-tracker",
    question: "Is there a way to track the jobs I've applied to?",
    answer: (
      <p>
        Yes, the <strong>Application Tracker</strong> (Professional and Premium) lets you log each application:
        company, role, status (applied, interviewing, offer, rejected, withdrawn), the job posting link, which
        resume you used, and your own notes, all in one place.
      </p>
    ),
  },
  {
    id: "career-center",
    question: "What's the Career Center?",
    answer: (
      <p>
        A Professional and Premium perk with curated resume tips, interview prep guidance, salary negotiation
        advice, and career articles, all in one hub separate from the resume editor itself.
      </p>
    ),
  },
  {
    id: "ask-poly",
    question: "What is Ask Poly?",
    answer: (
      <p>
        Poly is our AI Career Coach, a Premium feature for general career questions, like salary expectations,
        tricky interview questions, or which certifications to pursue, that aren't tied to any specific resume.
      </p>
    ),
  },
  {
    id: "cover-and-thank-you-letters",
    question: "Can ResumeLingo write cover letters or thank-you notes for me?",
    answer: (
      <p>
        Both are Premium features. The <strong>Cover Letter</strong> tool lets you pick one of your resumes, add
        the company and role you're targeting (and optionally the hiring manager's name), then edit, copy, or
        download the result. Separately, the <strong>Thank-You Letter</strong> tool covers common scenarios,
        post-interview, accepting an offer, staying in touch after a rejection, or following up after networking,
        and lets you download the result as a text file too.
      </p>
    ),
  },
  {
    id: "recruiter-mode",
    question: "What's Recruiter Mode?",
    answer: (
      <p>
        A Premium toggle in the editor that adds a candidate summary card to the top of your public resume link:
        skills pulled automatically from your resume, plus optional fields like availability, clearance, location,
        work authorization, expected salary, and remote preference. It's off by default, and every field is
        optional even once you turn it on.
      </p>
    ),
  },
  {
    id: "account-changes",
    question: "I want to change my email address or password.",
    answer: (
      <p>
        Go to your Profile page (click your name in the sidebar). Email changes require reverifying the new address.
        Check your inbox for a confirmation link after saving. To reset a forgotten password, use "Forgot password"
        on the login page instead.
      </p>
    ),
  },
  {
    id: "billing",
    question: "How do I cancel or change my subscription?",
    answer: (
      <p>
        To manage your subscription, scroll to the bottom of your Dashboard to the{" "}
        <strong>Subscription Management</strong> section and click <strong>Manage billing</strong>. This opens a
        secure Stripe page where you can update your card, switch plans, or cancel.
      </p>
    ),
  },
  {
    id: "privacy",
    question: "Is my resume data private?",
    answer: (
      <p>
        See our <Link to="/privacy">Privacy Policy</Link> for the full details on what we store and how it's used.
        Short version: your resume content is yours, visible only per the link visibility setting you choose, and
        never sold to third parties.
      </p>
    ),
  },
];

export function HelpPage() {
  useHashScroll();

  return (
    <main>
      <section className="wrap legal-page">
        <h1>Help &amp; Support</h1>
        <p className="hero-note">
          Answers to common questions, a walkthrough for building your first resume, and how to reach us directly.
        </p>

        <nav className="career-toc" aria-label="Help topics" style={{ marginBottom: 32 }}>
          <a href="#support">Contact support</a>
          <a href="#faq">FAQ</a>
          <a href="#quick-start">Quick start guide</a>
        </nav>

        <h2 id="support">Contact support</h2>
        <p>
          Email us at <a href="mailto:support@resumelingo.com">support@resumelingo.com</a> and we'll get back to you.
          For the fastest answer, check the FAQ below first. Most common questions are answered there.
        </p>

        <h2 id="faq">Frequently asked questions</h2>
        {FAQ_ITEMS.map((item) => (
          <div key={item.id} id={item.id} style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 8 }}>{item.question}</h3>
            {item.answer}
          </div>
        ))}

        <h2 id="quick-start">Quick start: creating your first resume</h2>
        <ol className="career-tips" style={{ listStyle: "decimal", paddingLeft: 22 }}>
          {QUICK_START_STEPS.map((step, i) => (
            <li key={i} style={{ marginBottom: 14 }}>
              <strong>{step.title}.</strong> {step.body}
            </li>
          ))}
        </ol>
        <p>
          That's the core loop. From here, most of what you'll do is revisit sections in the editor as your
          experience changes, using autosave (or the Save changes button) to keep it current.
        </p>
      </section>
    </main>
  );
}
