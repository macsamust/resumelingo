/**
 * Condensed checklist for the Dashboard's first-visit empty state
 * (`DashboardPage.tsx`) — deliberately NOT a slice of `QUICK_START_STEPS`
 * below. By the time someone lands on the Dashboard they've already created
 * an account and started a resume (that's how they got here), so restating
 * "Create your account" / "Start a new resume" from the full guide would be
 * telling them to redo something they just did. This list picks up from
 * where they actually are, and collapses "work experience and education"
 * plus "achievements or highlights" into one line to stay short.
 */
export const DASHBOARD_TEASER_STEPS: string[] = [
  "Fill in your basics",
  "Add your pertinent info: work experience and education, achievements or highlights",
  "Review generated summary",
  "Create resume",
  "Share resume",
];

/**
 * Single source of truth for the "how to build your first resume" steps —
 * shown in full on the Help page (`HelpPage.tsx`, #quick-start). Kept in one
 * place so it can't drift out of sync as the builder flow changes.
 */
export const QUICK_START_STEPS: { title: string; body: JSX.Element }[] = [
  {
    title: "Create your account",
    body: (
      <p>
        Sign up with your name, email, and a password. You'll get a verification email. Click the link to confirm
        your address (this doesn't block you from using the app right away, it's just a nudge).
      </p>
    ),
  },
  {
    title: "Start a new resume",
    body: (
      <p>
        From your Dashboard, click <strong>New Resume</strong>. Pick the profession closest to your field. This
        shapes some of the guided questions you'll get later, and choose a template. The template choice isn't
        permanent; it can be changed later from the editor.
      </p>
    ),
  },
  {
    title: "Fill in your basics",
    body: <p>Name, contact info (email, phone, LinkedIn, all optional except what you want shown), and a professional title.</p>,
  },
  {
    title: "Add your work experience and education",
    body: (
      <p>
        Enter your job history and schooling. If you already have a resume as a PDF or Word doc, try{" "}
        <strong>Import an existing resume</strong> instead. It reads the file and pre-fills these sections for you,
        which you can then review and adjust.
      </p>
    ),
  },
  {
    title: "Add achievements or highlights",
    body: (
      <p>
        These are the specific, results oriented bullet points that make a resume stand out: think "increased X by
        Y%" rather than a plain duty description. If you're not sure what to write, the achievement generator can
        help draft one from a short description of what you did.
      </p>
    ),
  },
  {
    title: "Review your AI generated summary",
    body: (
      <p>
        Once you've filled in enough of the above, ResumeLingo writes a professional summary and bullet points for
        you automatically. Use it as-is, edit it directly, or click Regenerate for a different version.
      </p>
    ),
  },
  {
    title: "Create the resume",
    body: (
      <p>
        Click <strong>Create my resume</strong> at the bottom of the form. This takes you into the full editor, where
        every section above (and a few more: Skills &amp; Tools, Awards, Additional Details) can be revisited and
        refined any time.
      </p>
    ),
  },
  {
    title: "Share it",
    body: (
      <p>
        In the editor's <strong>Sharing</strong> section, copy your public link and choose who can see it (public,
        private, or password protected, depending on your plan).
      </p>
    ),
  },
];
