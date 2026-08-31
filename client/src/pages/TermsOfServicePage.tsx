/**
 * DRAFT — see PrivacyPolicyPage.tsx's doc comment for why this needs a real
 * legal review before launch (terms of service carry contractual/liability
 * weight a non-lawyer drafting pass shouldn't sign off on as final).
 */
export function TermsOfServicePage() {
  return (
    <main>
      <section className="wrap legal-page">
        <div className="legal-draft-banner">
          <strong>Draft, not yet reviewed by a lawyer.</strong> These terms describe how ResumeLingo actually works
          today, but hasn't had a legal review pass. Don't treat it as final until that happens.
        </div>

        <h1>Terms of Service</h1>
        <p className="hero-note">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <h2>Your account</h2>
        <p>
          You're responsible for keeping your login credentials secure and for anything that happens under your
          account. You must be old enough to legally form a contract in your jurisdiction to use ResumeLingo. You're
          responsible for the accuracy of what you put in your resume. We don't verify claims, dates, or
          credentials you enter.
        </p>

        <h2>Subscriptions and billing</h2>
        <p>
          Starter is free. Professional and Premium are paid monthly subscriptions billed through Stripe. You can
          cancel at any time; your plan stays active through the end of the period you've already paid for. We don't
          currently offer prorated refunds for a midcycle cancellation.
        </p>

        <h2>AI generated content</h2>
        <p>
          Resume summaries, bullet points, cover letters, and Career Coach answers are written with the help of an AI
          model (Cloudflare Workers AI). This content is a starting point, not a guarantee of accuracy. AI generated
          text can occasionally be wrong, oddly phrased, or not quite what you meant. You're responsible for
          reviewing and editing anything AI generated before you send it to an employer or publish it on your public
          resume link.
        </p>

        <h2>Public resume links</h2>
        <p>
          If you set your resume link to public, anyone with that link can view it. You're responsible for deciding
          what to share and with whom: use a private link, a password protected link, or an expiration date if you
          want to limit who can see it or for how long.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Don't use ResumeLingo to publish false credentials with intent to defraud an employer, to upload content
          that infringes someone else's copyright, or to abuse the service (scripted account creation, scraping,
          attempting to bypass rate limits or access controls). We reserve the right to suspend or remove an account
          that violates this.
        </p>

        <h2>Service availability</h2>
        <p>
          We aim to keep ResumeLingo available, but don't guarantee uninterrupted access. The service depends on
          third party infrastructure (Cloudflare, Stripe, Resend) that's outside our direct control. We're not liable
          for lost access, lost data, or missed opportunities resulting from downtime.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms as the product changes. Continued use of ResumeLingo after an update means you
          accept the revised terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Email <a href="mailto:support@resumelingo.com">support@resumelingo.com</a>.
        </p>
      </section>
    </main>
  );
}
