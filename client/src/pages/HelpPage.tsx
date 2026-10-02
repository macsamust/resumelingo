import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Link, MemoryRouter, useLocation } from "react-router-dom";
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
type FaqCategoryId = "getting-started" | "sharing" | "tools" | "account" | "emails";

/** Display order and labels for the collapsed FAQ groups. Each FAQ_ITEMS entry picks one via its `category`. */
const FAQ_CATEGORIES: { id: FaqCategoryId; label: string }[] = [
  { id: "getting-started", label: "Getting started & editing" },
  { id: "sharing", label: "Sharing & privacy" },
  { id: "tools", label: "Premium & Professional tools" },
  { id: "account", label: "Account & billing" },
  { id: "emails", label: "Emails & guidance" },
];

const FAQ_ITEMS: { id: string; category: FaqCategoryId; question: string; answer: JSX.Element }[] = [
  {
    id: "changes-not-showing",
    category: "getting-started",
    question: "I made changes to my resume but I don't see them when I view it. What happened?",
    answer: (
      <>
        <p>
          Most of the editor autosaves the moment you leave a field- look for <strong>"All changes saved"</strong>{" "}
          near the top, or <strong>"Couldn't autosave…"</strong> if it hiccuped. There's also a{" "}
          <strong>Save changes</strong> button for saving on demand.
        </p>
        <p>
          One exception: <strong>Generated Summary &amp; Bullets</strong> only saves via its own{" "}
          <strong>Save summary</strong> button, it doesn't autosave with the rest of the form.
        </p>
        <p>
          If a change isn't showing on your public link, hard-refresh (Cmd+Shift+R / Ctrl+Shift+R), browsers
          sometimes cache that page.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    category: "sharing",
    question: "How do I share my resume with someone?",
    answer: (
      <p>
        Open the resume in the editor and go to the <strong>Sharing</strong> section. You'll find your public link
        there, which you can copy and send directly, or open in a new tab to preview exactly what a viewer will see.
      </p>
    ),
  },
  {
    id: "branded-link",
    category: "sharing",
    question: "I upgraded to Premium, why doesn't my existing resume's link show my name?",
    answer: (
      <p>
        Premium resumes get a branded public link (your name plus the resume title, instead of a random one) —
        but only resumes created after you upgrade get it automatically. A resume you built before upgrading keeps
        the link it was created with. If you'd like that same resume to have the branded link, open it and use{" "}
        <strong>Clone</strong> to make a copy — the clone is created under your current plan, so it'll pick up the
        branded link right away.
      </p>
    ),
  },
  {
    id: "link-visibility",
    category: "sharing",
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
    id: "pause-link",
    category: "sharing",
    question: "Can I temporarily turn off my resume's public link?",
    answer: (
      <p>
        Yes, on Professional and Premium plans. Each resume on your Dashboard has an <strong>Active</strong> /{" "}
        <strong>Inactive</strong> toggle. Switch it to Inactive to pause the link without deleting anything, and
        switch it back to Active whenever you're ready to share it again.
      </p>
    ),
  },
  {
    id: "verify-before-sharing",
    category: "sharing",
    question: "Do I need to verify my email before sharing?",
    answer: (
      <p>
        Only if you want your link to be <strong>Public</strong> or <strong>Password protected</strong> — those
        visibility settings require a verified email, since they make your resume reachable outside your account.{" "}
        <strong>Private</strong> stays available either way. Check your inbox for the verification email, or resend
        it from the banner at the top of the app or from the Sharing section itself.
      </p>
    ),
  },
  {
    id: "resume-limit",
    category: "getting-started",
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
    category: "getting-started",
    question: "Can I edit the summary and bullet points Poly writes?",
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
    category: "tools",
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
    category: "getting-started",
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
    category: "getting-started",
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
    category: "tools",
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
    category: "tools",
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
    category: "tools",
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
    category: "tools",
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
    category: "tools",
    question: "What's Recruiter Mode?",
    answer: (
      <p>
        A Premium toggle in the editor that adds a candidate summary card to your public resume link: skills pulled
        automatically from your resume, plus optional fields like availability, clearance, location, work
        authorization, expected salary, and remote preference. It's off by default, and you set a{" "}
        <strong>Recruiter access code</strong> when you turn it on. The card stays hidden until a recruiter enters
        that code, so share it only with the people you want to see those details. Every field in the card is
        optional.
      </p>
    ),
  },
  {
    id: "references",
    category: "tools",
    question: "Can I add references to my resume?",
    answer: (
      <p>
        Yes, on Professional and Premium plans. Open the <strong>References</strong> section in the editor, turn on
        the option to add a References section, and enter at least one reference. It's off by default, so nothing
        appears on your public link until you do. On Premium, you can also choose to show references only when
        Recruiter Mode is on.
      </p>
    ),
  },
  {
    id: "version-history",
    category: "tools",
    question: "Can I undo changes or go back to an earlier version of my resume?",
    answer: (
      <p>
        Yes, with Premium. A version is saved automatically each time you save an edit, and the{" "}
        <strong>Version History</strong> section in the editor lets you <strong>Restore</strong> any of the last 10.
        Restoring saves your current version to history first, so you can undo the restore too.
      </p>
    ),
  },
  {
    id: "resume-refresh-emails",
    category: "emails",
    question: "Why did I get an email asking about my current job?",
    answer: (
      <p>
        That's the Resume Refresh nudge. If a resume looks like it hasn't been updated in a while, we email you
        asking whether you're still in your latest role. The link opens a quick page, no login needed, where you can
        pick keywords or describe a challenge, action, and result to get draft bullet points. You review and edit
        them before anything is saved. Every email includes an unsubscribe link if you'd rather not receive them.
      </p>
    ),
  },
  {
    id: "full-circle",
    category: "emails",
    question: "What's the \"circle\" I see on my resume after I create it?",
    answer: (
      <p>
        That's Full Circle, a short post-publish checklist that walks you from a finished resume to actually using
        it: share your link, track your applications (Professional and Premium), and write cover or thank-you
        letters (Premium). You can snooze it for a week if you'd rather not see it. See the{" "}
        <Link to="/full-circle">Full Circle page</Link> for the bigger picture.
      </p>
    ),
  },
  {
    id: "account-changes",
    category: "account",
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
    category: "account",
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
    category: "sharing",
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
  const location = useLocation();
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [openQs, setOpenQs] = useState<Set<string>>(new Set());

  // Deep links like /help#recruiter-mode (or #sharing-privacy for a whole group): open the
  // target's collapsed group/question first, then re-scroll once it has expanded.
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (!hash) return;
    const item = FAQ_ITEMS.find((f) => f.id === hash);
    const cat = item?.category ?? FAQ_CATEGORIES.find((c) => `faq-${c.id}` === hash)?.id;
    if (!cat) return;
    setOpenCats((prev) => new Set(prev).add(cat));
    if (item) setOpenQs((prev) => new Set(prev).add(item.id));
    requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [location.hash]);

  // Search: match the question plus the answer's plain text (JSX rendered once, tags stripped).
  const [query, setQuery] = useState("");
  const searchText = useMemo(
    () =>
      new Map(
        FAQ_ITEMS.map((f) => [
          f.id,
          `${f.question} ${renderToStaticMarkup(<MemoryRouter>{f.answer}</MemoryRouter>).replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&")}`.toLowerCase(),
        ])
      ),
    []
  );
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  const matches = (id: string) => terms.every((t) => searchText.get(id)?.includes(t));
  const matchCount = searching ? FAQ_ITEMS.filter((f) => matches(f.id)).length : FAQ_ITEMS.length;

  // Highlight matches with the CSS Custom Highlight API (styled via ::highlight(faq-search) in
  // global.css). It paints over text ranges without touching the DOM React manages; browsers
  // without support just skip the highlight and everything else still works.
  const faqRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const css = (window as any).CSS;
    const HighlightCtor = (window as any).Highlight;
    if (!css?.highlights || !HighlightCtor) return;
    css.highlights.delete("faq-search");
    const root = faqRef.current;
    if (!root || terms.length === 0) return;
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.parentElement?.closest(".faq-item")) continue;
      const text = (node.textContent ?? "").toLowerCase();
      for (const term of terms) {
        for (let at = text.indexOf(term); at !== -1; at = text.indexOf(term, at + term.length)) {
          const range = new Range();
          range.setStart(node, at);
          range.setEnd(node, at + term.length);
          ranges.push(range);
        }
      }
    }
    css.highlights.set("faq-search", new HighlightCtor(...ranges));
    return () => css.highlights.delete("faq-search");
  }, [query]);

  const toggle = (set: Set<string>, id: string, open: boolean) => {
    const next = new Set(set);
    if (open) next.add(id);
    else next.delete(id);
    return next;
  };

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
        <input
          type="search"
          className="faq-search"
          placeholder="Search the FAQ"
          aria-label="Search the FAQ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && (
          <p className="faq-search-status" role="status">
            {matchCount === 0
              ? "No matches. Try different words, or email support@resumelingo.com."
              : `${matchCount} ${matchCount === 1 ? "match" : "matches"}`}
          </p>
        )}
        <div ref={faqRef}>
        {FAQ_CATEGORIES.map((cat) => {
          const items = FAQ_ITEMS.filter((f) => f.category === cat.id && (!searching || matches(f.id)));
          if (items.length === 0) return null;
          return (
            <details
              key={cat.id}
              id={`faq-${cat.id}`}
              className="faq-group"
              open={searching || openCats.has(cat.id)}
              onToggle={(e) => {
                if (searching) return;
                const isOpen = e.currentTarget.open;
                setOpenCats((prev) => toggle(prev, cat.id, isOpen));
              }}
            >
              <summary>
                {cat.label} <span className="faq-count">{items.length}</span>
              </summary>
              {items.map((item) => (
                <details
                  key={item.id}
                  id={item.id}
                  className="faq-item"
                  open={searching || openQs.has(item.id)}
                  onToggle={(e) => {
                    if (searching) return;
                    const isOpen = e.currentTarget.open;
                    setOpenQs((prev) => toggle(prev, item.id, isOpen));
                  }}
                >
                  <summary>{item.question}</summary>
                  <div className="faq-answer">{item.answer}</div>
                </details>
              ))}
            </details>
          );
        })}
        </div>

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
