/**
 * DRAFT — see the banner rendered at the top of the page. Written directly
 * from what this codebase actually does (accounts, resume content, Stripe
 * billing, Resend transactional email, Cloudflare Workers AI) rather than
 * generic boilerplate, but this is not a substitute for review by an
 * actual lawyer before launch — data-protection language carries real
 * legal weight (GDPR/CCPA-style obligations, liability for
 * misrepresenting what's collected) that a non-lawyer drafting pass can't
 * responsibly sign off on. Added as part of the Aug 2026 pre-launch
 * review — see TODO.md.
 */
export function PrivacyPolicyPage() {
  return (
    <main>
      <section className="wrap legal-page">
        <div className="legal-draft-banner">
          <strong>Draft — not yet reviewed by a lawyer.</strong> This page describes what ResumeLingo actually
          collects and does with it today, but hasn't had a legal review pass. Don't treat it as final until that
          happens.
        </div>

        <h1>Privacy Policy</h1>
        <p className="hero-note">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2>What we collect</h2>
        <p>
          When you create an account, we collect your name, email address, and password (stored as a bcrypt hash —
          we never store or have access to your actual password). If you choose to tell us, we also store your
          profession, used to tailor the resume-building questionnaire.
        </p>
        <p>
          When you build a resume, we store everything you enter into it: contact details, work history, education,
          achievements, awards, skills, and any photo you upload. Some of this (your professional summary, resume
          bullet points, cover letters) is written with the help of an AI model — see "AI-generated content" below.
        </p>
        <p>
          If you subscribe to a paid plan, billing is handled by Stripe. We store your Stripe customer and
          subscription IDs so we know which plan you're on, but we never see or store your card number — Stripe
          handles that directly, under{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
            Stripe's own privacy policy
          </a>
          .
        </p>
        <p>
          If you make your resume link public, we record a basic view count and timestamp each time it's loaded —
          nothing more (no visitor identity, location, device, or browsing history is captured today).
        </p>

        <h2>AI-generated content</h2>
        <p>
          Resume summaries, bullet points, cover letters, and answers from the AI Career Coach are generated using
          Cloudflare Workers AI, which runs the underlying language models on Cloudflare's infrastructure. The
          profession, work history, and questions you provide are sent to that model to generate this content. We
          don't use your data to train any AI model ourselves.
        </p>

        <h2>Emails we send</h2>
        <p>
          We use Resend to send account-related email: verifying your email address, password reset links, and (for
          Professional/Premium subscribers, unless you opt out) a weekly summary of views on your resumes. Every
          marketing-style email includes an unsubscribe option; account-security emails (verification, password
          reset) can't be turned off, since they're required to keep your account secure.
        </p>

        <h2>Cookies and local storage</h2>
        <p>
          We don't use tracking cookies. Your login session is kept in your browser's local storage, not a cookie.
          If you go through checkout for a paid plan, Stripe's own hosted checkout page may set its own cookies while
          you're on stripe.com — that's covered by Stripe's privacy policy, not this one.
        </p>

        <h2>Who can see your data</h2>
        <p>
          Your resume is private by default. If you set a public link, anyone with that link can view it (or must
          enter a password first, if you've set one). We don't sell your data to anyone, and we don't share it with
          third parties except the service providers named on this page (Stripe for billing, Resend for email,
          Cloudflare for hosting and AI features) — each only to do the specific job they're used for here.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your account and resume data for as long as your account exists. If you'd like your account and
          its data deleted, contact us and we'll remove it — there's no self-service deletion button today.
        </p>

        <h2>Your choices</h2>
        <p>
          You can edit or delete any resume at any time from your dashboard, change your profile details from your
          account settings, and opt out of the weekly view digest email from your profile's email preferences.
        </p>

        <h2>Contact</h2>
        <p>Questions about this policy or your data — reach out to us directly.</p>
      </section>
    </main>
  );
}
