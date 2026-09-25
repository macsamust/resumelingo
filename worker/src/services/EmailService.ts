/**
 * Node/Express counterpart: server/src/services/EmailService.ts (kept as
 * close to line-for-line identical as possible, same pattern as
 * StripeService/TokenService's split). Calls Resend's HTTP API directly via
 * fetch — no SDK needed, so this runs unchanged in the Workers runtime.
 *
 * Unlike server/'s version (which defaults to reading process.env),
 * everything here is wired explicitly from Env in createServices.ts, same
 * as every other worker service (Workers has no process.env).
 *
 * Every template's HTML-building is split into a private `buildX` method
 * returning `{ subject, html }`, with the public `sendX` method just calling
 * it and handing the result to `send()`. This exists so the Admin Console's
 * Email Templates preview page (AdminEmailTemplateController, Sep 2026 — CJ
 * wanted a way to see what every email actually looks like without digging
 * through this file) can call `renderPreview()` and get the *exact* same
 * markup a real send would produce, with no separate copy of the template to
 * drift out of sync.
 */
export class EmailService {
  /**
   * Metadata for every template this service can send — label, one-line
   * trigger description, and its `key` for `renderPreview()`. The Admin
   * Console's preview page reads this list directly rather than
   * hardcoding its own copy. `account-suspended` is split into two keys
   * (with-resumes / no-resumes) rather than one, since
   * `sendAccountSuspendedEmail`'s `hasResumes` flag changes the body text
   * materially enough that showing only one variant would hide real
   * behavior from whoever's previewing it.
   */
  static readonly TEMPLATES: { key: string; label: string; trigger: string }[] = [
    { key: "verification", label: "Verify your email address", trigger: "Sent on signup, and again on any email-address change." },
    { key: "password-reset", label: "Reset your password", trigger: "Sent when a user requests a password reset." },
    {
      key: "account-suspended-with-resumes",
      label: "Account suspended (has resumes)",
      trigger: "Sent when an unverified account that owns resumes is auto-suspended, 1 hour after signup.",
    },
    {
      key: "account-suspended-no-resumes",
      label: "Account suspended (no resumes)",
      trigger: "Sent when an unverified account with no resumes is auto-suspended, 1 hour after signup.",
    },
    { key: "payment-failed", label: "Payment didn't go through", trigger: "Sent when a Stripe subscription-renewal charge fails." },
    { key: "welcome", label: "Welcome to ResumeLingo", trigger: "Sent once, right after signup." },
    { key: "subscription-confirmation", label: "You're on the ___ plan", trigger: "Sent once per upgrade into a paid tier." },
    { key: "view-digest", label: "Weekly resume view digest", trigger: "Sent weekly with a subscriber's resume view count." },
    {
      key: "resume-refresh-nudge",
      label: "Resume check-in (CAR nudge)",
      trigger: "Sent when a resume has gone quiet past its account's chosen refresh cadence.",
    },
    { key: "security-alert", label: "Security alert (critical)", trigger: "Sent immediately to every admin on a critical security event." },
    {
      key: "security-daily-digest",
      label: "Security daily digest",
      trigger: "Sent once daily to every admin, rolling up the day's non-critical security events.",
    },
  ];

  constructor(private readonly apiKey: string | undefined, private readonly fromEmail: string | undefined) {}

  private async send(input: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      throw new Error(
        "RESEND_API_KEY / RESEND_FROM_EMAIL are not set (see worker/package.json's secret:resend-key script and wrangler.jsonc's vars). Email sending is not configured."
      );
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend API error (${res.status}): ${body || res.statusText}`);
    }
  }

  /**
   * Renders any template in `TEMPLATES` with representative sample data, for
   * the Admin Console's preview page only — never sent anywhere. Returns
   * null for an unrecognized key rather than throwing, so the controller can
   * turn that into a clean 404.
   */
  renderPreview(key: string): { subject: string; html: string } | null {
    const sampleUrl = "https://resumelingo.com/sample-link";
    switch (key) {
      case "verification":
        return this.buildVerificationEmail(sampleUrl);
      case "password-reset":
        return this.buildPasswordResetEmail(sampleUrl);
      case "account-suspended-with-resumes":
        return this.buildAccountSuspendedEmail(sampleUrl, true, 95);
      case "account-suspended-no-resumes":
        return this.buildAccountSuspendedEmail(sampleUrl, false, 95);
      case "payment-failed":
        return this.buildPaymentFailedEmail(sampleUrl);
      case "welcome":
        return this.buildWelcomeEmail("jordan@example.com", "Jordan Rivera", sampleUrl, {
          planName: "Professional",
          termsUrl: sampleUrl,
          termsAcceptedAt: new Date().toISOString(),
        });
      case "subscription-confirmation":
        return this.buildSubscriptionConfirmationEmail("Professional", sampleUrl);
      case "view-digest":
        return this.buildViewDigestEmail({ totalViews: 7, unsubscribeUrl: sampleUrl });
      case "resume-refresh-nudge":
        return this.buildResumeRefreshNudgeEmail({
          resumes: [
            {
              resumeTitle: "Senior Product Manager Resume",
              company: "Acme Corp",
              jobTitle: "Senior Product Manager",
              keywords: ["Roadmapping", "Stakeholder alignment", "SQL"],
              nudgeUrl: sampleUrl,
            },
            {
              resumeTitle: "UX Designer Resume",
              company: null,
              jobTitle: null,
              keywords: [],
              nudgeUrl: sampleUrl,
            },
          ],
          unsubscribeUrl: sampleUrl,
        });
      case "security-alert":
        return this.buildSecurityAlertEmail("login_brute_force", { ip: "203.0.113.42", attempts: 12 });
      case "security-daily-digest":
        return this.buildSecurityDailyDigestEmail([
          { type: "register_burst", severity: "warning", count: 3 },
          { type: "password_reset_spam", severity: "warning", count: 1 },
        ]);
      default:
        return null;
    }
  }

  private buildPasswordResetEmail(resetUrl: string): { subject: string; html: string } {
    return {
      subject: "Reset your ResumeLingo password",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Reset your password</h2>
          <p>We received a request to reset the password on your ResumeLingo account. This link expires in 1 hour.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset password</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or paste this link into your browser: ${resetUrl}</p>
        </div>
      `,
    };
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send({ to, ...this.buildPasswordResetEmail(resetUrl) });
  }

  private buildVerificationEmail(verifyUrl: string): { subject: string; html: string } {
    return {
      subject: "Verify your ResumeLingo email address",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Verify your email address</h2>
          <p>Confirm that this is your email address to finish setting up your ResumeLingo account. This link expires in 1 hour.</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify email address</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">Until this is confirmed, any resume you share stays visible to you only — no one else can open the link yet.</p>
          <p style="color: #64748b; font-size: 13px;">If you didn't create this account or make this change, you can safely ignore this email.</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or paste this link into your browser: ${verifyUrl}</p>
        </div>
      `,
    };
  }

  /** Sent on register and on every email-address change (see AuthService.sendVerificationEmail) — confirms the account holder actually controls the address. Link expires in 1 hour (VERIFICATION_TOKEN_TTL_MS — shortened from an original 24h, see that constant's doc comment); the settings-page/AppShell banner can trigger a fresh one via resendVerificationEmail if it lapses. */
  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    await this.send({ to, ...this.buildVerificationEmail(verifyUrl) });
  }

  private buildAccountSuspendedEmail(
    verifyUrl: string,
    hasResumes: boolean,
    hoursUntilDeletion: number
  ): { subject: string; html: string } {
    const body = hasResumes
      ? `Your email address was never verified, so this account has been automatically suspended. Any resume you shared has been visible only to you this whole time — the link doesn't open for anyone else until your email is verified. Verify now to restore access, or the account will be permanently removed in ${hoursUntilDeletion} hours.`
      : `Your email address was never verified, and no resume has been created on this account, so it's been automatically suspended. Verify your email now to restore access — otherwise the account will be permanently removed in ${hoursUntilDeletion} hours.`;
    const footer = "If you didn't create this account, no action is needed — it'll be removed automatically.";
    return {
      subject: "Your ResumeLingo account has been suspended — verify to restore it",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Your account has been suspended</h2>
          <p>${body}</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify email address</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">${footer}</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or paste this link into your browser: ${verifyUrl}</p>
        </div>
      `,
    };
  }

  /**
   * StaleAccountCleanupService's suspend-step notice (see
   * UserRepository.findEligibleForSuspension/suspendForUnverifiedEmail),
   * sent once when an unverified account gets automatically suspended an
   * hour after signup — resumes or not (CJ, Sep 2026: suspension applies to
   * every unverified account). It links straight to a *fresh* verify token
   * — minted via AuthService.generateFreshVerificationUrl right before this
   * send — rather than to login, since login is now blocked while the
   * account is suspended (see AuthService.login's suspensionReason check).
   * Verifying via this link auto-lifts the suspension (see
   * UserRepository.confirmEmailVerification).
   *
   * `hasResumes` only changes the wording, not the countdown: both
   * suspension and deletion now apply to every unverified account on the
   * same schedule regardless of resume count (see
   * UserRepository.findEligibleForSuspension/findEligibleForStalePurge —
   * CJ, Sep 2026, first added a resume-owning exemption to deletion, then
   * simplified to one shared 96h window for everyone: "Lets make both
   * deletion windows 96 to keep things simple"). Still branches the body
   * text, though, since telling a resume-owning account "no resume has been
   * created on this account" would just be false.
   */
  async sendAccountSuspendedEmail(to: string, verifyUrl: string, hasResumes: boolean, hoursUntilDeletion: number): Promise<void> {
    await this.send({ to, ...this.buildAccountSuspendedEmail(verifyUrl, hasResumes, hoursUntilDeletion) });
  }

  private buildPaymentFailedEmail(dashboardUrl: string): { subject: string; html: string } {
    return {
      subject: "Your ResumeLingo payment didn't go through",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">We couldn't process your payment</h2>
          <p>Your card on file was declined for your ResumeLingo subscription renewal. We'll try again automatically over the next several days, but your access may be interrupted if the charge keeps failing.</p>
          <p style="margin: 24px 0;">
            <a href="${dashboardUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Update payment method</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">Click through to your dashboard and choose "Manage billing" to update your card. If you've already updated it, no action is needed. This will resolve on the next retry.</p>
        </div>
      `,
    };
  }

  /** Sent from SubscriptionService.handleWebhookEvent's "invoice.payment_failed" case — Stripe already retries the charge on its own schedule, this just makes sure the subscriber knows to update their card instead of finding out only once the subscription actually gets cancelled. */
  async sendPaymentFailedEmail(to: string, dashboardUrl: string): Promise<void> {
    await this.send({ to, ...this.buildPaymentFailedEmail(dashboardUrl) });
  }

  private buildWelcomeEmail(
    to: string,
    name: string,
    loginUrl: string,
    details: { planName: string; termsUrl: string; termsAcceptedAt: string | null }
  ): { subject: string; html: string } {
    const acceptedOn = details.termsAcceptedAt
      ? new Date(details.termsAcceptedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : null;
    return {
      subject: "Welcome to ResumeLingo",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Welcome to ResumeLingo, ${name}!</h2>
          <p>Your account is set up under <strong>${to}</strong>. You can build your first resume any time from your dashboard.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">Account details</p>
            <p style="margin: 0 0 4px;">Name: ${name}</p>
            <p style="margin: 0 0 4px;">Plan: ${details.planName}</p>
            <p style="margin: 0;">
              Terms of Service: accepted${acceptedOn ? ` on ${acceptedOn}` : ""} —
              <a href="${details.termsUrl}" style="color: #4f46e5;">view the terms</a>
            </p>
          </div>
          <p style="margin: 24px 0;">
            <a href="${loginUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to your dashboard</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">Check your inbox for a separate email to verify your address, if you haven't already.</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or paste this link into your browser: ${loginUrl}</p>
        </div>
      `,
    };
  }

  /**
   * Doubles as the account-creation confirmation (name, plan, and Terms of
   * Service acceptance) rather than sending a separate fourth email for
   * that — see AuthService.register, which is this method's only caller.
   * `details.termsAcceptedAt` is expected non-null here (register() always
   * sets it, having already rejected an unaccepted signup before it gets
   * this far) — rendered defensively anyway so a future caller that omits
   * it gets a sane fallback instead of "Invalid Date" in the email.
   * Deliberately never includes a password, even a freshly-chosen one —
   * plaintext credentials sitting in an inbox indefinitely is a real
   * security anti-pattern regardless of how the account was created.
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    loginUrl: string,
    details: { planName: string; termsUrl: string; termsAcceptedAt: string | null }
  ): Promise<void> {
    await this.send({ to, ...this.buildWelcomeEmail(to, name, loginUrl, details) });
  }

  private buildSubscriptionConfirmationEmail(planName: string, dashboardUrl: string): { subject: string; html: string } {
    return {
      subject: `You're on the ${planName} plan`,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">You're now on the ${planName} plan</h2>
          <p>Thanks for subscribing to ResumeLingo ${planName}. Your account has been updated and everything included in this plan is available now.</p>
          <p style="margin: 24px 0;">
            <a href="${dashboardUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to your dashboard</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">This isn't a billing receipt — for a record of the charge itself, check the payment confirmation from Stripe.</p>
        </div>
      `,
    };
  }

  /**
   * Sent once per transition into an active paid tier (see
   * SubscriptionService.syncSubscription — not on every renewal, only when
   * the tier actually changes) — the app's own confirmation that the
   * subscription is live, distinct from whatever generic payment receipt
   * Stripe itself may send. Not a financial receipt (no amount/card
   * details) — Stripe already owns that, and duplicating it risks drifting
   * out of sync with proration/discounts/tax Stripe actually applied.
   */
  async sendSubscriptionConfirmationEmail(to: string, planName: string, dashboardUrl: string): Promise<void> {
    await this.send({ to, ...this.buildSubscriptionConfirmationEmail(planName, dashboardUrl) });
  }

  private buildViewDigestEmail(input: { totalViews: number; unsubscribeUrl: string }): { subject: string; html: string } {
    const viewsLabel = input.totalViews === 1 ? "1 view" : `${input.totalViews} views`;
    return {
      subject: `Your resume got ${viewsLabel} this week`,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Your weekly resume digest</h2>
          <p>Your resumes got <strong>${viewsLabel}</strong> over the past 7 days.</p>
          <p style="color: #64748b; font-size: 13px;">Log in to ResumeLingo to see the full breakdown and keep your resume up to date.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Don't want these emails? <a href="${input.unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe from the weekly digest</a>.</p>
        </div>
      `,
    };
  }

  /** Weekly re-engagement digest (ViewDigestService) — "N views this week" plus a mandatory unsubscribe link (CAN-SPAM requirement for any recurring email like this). */
  async sendViewDigestEmail(to: string, input: { totalViews: number; unsubscribeUrl: string }): Promise<void> {
    await this.send({ to, ...this.buildViewDigestEmail(input) });
  }

  private buildResumeRefreshNudgeEmail(input: {
    resumes: { resumeTitle: string; company: string | null; jobTitle: string | null; keywords: string[]; nudgeUrl: string }[];
    unsubscribeUrl: string;
  }): { subject: string; html: string } {
    const subject =
      input.resumes.length === 1
        ? `Still at ${input.resumes[0].company ?? "the same job"}? Quick resume check-in`
        : `Quick check-in on ${input.resumes.length} resumes`;

    const sections = input.resumes
      .map((r) => {
        const question = r.company && r.jobTitle
          ? `Are you still working at <strong>${r.company}</strong> as <strong>${r.jobTitle}</strong>?`
          : `Is "${r.resumeTitle}" still up to date?`;
        const keywordsHtml =
          r.keywords.length > 0
            ? `<p style="color: #64748b; font-size: 13px; margin: 8px 0 0;">A few keywords worth considering for this role, from our curated list for this profession: ${r.keywords.join(", ")}.</p>`
            : "";
        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
            <p style="margin: 0 0 10px;">${question}</p>
            ${keywordsHtml}
            <p style="margin: 14px 0 0;">
              <a href="${r.nudgeUrl}" style="background: #4f46e5; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13.5px;">Answer — no login needed</a>
            </p>
          </div>
        `;
      })
      .join("");

    return {
      subject,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Time for a resume check-in</h2>
          <p style="color: #64748b; font-size: 13.5px;">It's been a while since we heard from you on ${input.resumes.length === 1 ? "this resume" : "these resumes"}. Answer below — no login required.</p>
          ${sections}
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Don't want these emails? <a href="${input.unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe from the resume refresh nudge</a>.</p>
        </div>
      `,
    };
  }

  /**
   * AI Resume Refresh nudge (ResumeRefreshNudgeService) — checks in on each
   * resume that's gone quiet past its account's chosen cadence, one section
   * per resume, all combined into a single email per subscriber (the
   * product decision — see TODO.md — was "combine", not one email per stale
   * resume). Each resume's "still working there?" question links to its own
   * signed no-login landing page (nudgeUrl); the keyword list is the
   * curated skill_suggestions catalog for that resume's profession, not a
   * claim about live job postings — the copy here is written to stay honest
   * about that (see TODO.md's "I do not want to oversell features"
   * decision). Same mandatory unsubscribe link as the weekly digest.
   */
  async sendResumeRefreshNudgeEmail(
    to: string,
    input: {
      resumes: { resumeTitle: string; company: string | null; jobTitle: string | null; keywords: string[]; nudgeUrl: string }[];
      unsubscribeUrl: string;
    }
  ): Promise<void> {
    await this.send({ to, ...this.buildResumeRefreshNudgeEmail(input) });
  }

  /** Human-readable label for a SecurityEventType — shared by the alert and digest emails below, and worth keeping in sync with AdminSecurityReportPage.tsx's client-side copy of the same labels. */
  private static securityEventLabel(type: string): string {
    const labels: Record<string, string> = {
      login_brute_force: "Repeated failed logins",
      register_burst: "Registration burst",
      verify_brute_force: "Repeated failed email verification attempts",
      resend_spam: "Verification email resend spam",
      password_reset_spam: "Password reset request spam",
      public_resume_password_guessing: "Public resume password guessing",
      admin_login_brute_force: "Repeated failed admin logins",
      admin_mass_delete: "Unusual volume of admin deletes",
    };
    return labels[type] ?? type;
  }

  private buildSecurityAlertEmail(type: string, detail: Record<string, unknown> | null): { subject: string; html: string } {
    const label = EmailService.securityEventLabel(type);
    const detailRows = detail
      ? Object.entries(detail)
          .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
          .join("")
      : "";
    return {
      subject: `[ResumeLingo Security] ${label}`,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">${label}</h2>
          <p>The security monitor flagged this as a threshold-based signal — worth a look, not a confirmed breach.</p>
          ${detailRows ? `<ul style="color: #475569; font-size: 14px;">${detailRows}</ul>` : ""}
          <p style="color: #64748b; font-size: 13px;">See the full history on the Admin Console's Security Report page.</p>
        </div>
      `,
    };
  }

  /**
   * Fired immediately (not batched into the daily digest below) the moment
   * SecurityAlertService.recordIfNew writes a `critical` security_events row
   * — see that class's dedupe guard for why this fires once per burst, not
   * once per blocked request. Sent to every admin account (see
   * AdminRepository.findAll, falling back to env.ADMIN_EMAIL if none exist
   * yet) since this is operational, not marketing, mail — no
   * unsubscribe/opt-out needed.
   */
  async sendSecurityAlertEmail(to: string, type: string, detail: Record<string, unknown> | null): Promise<void> {
    await this.send({ to, ...this.buildSecurityAlertEmail(type, detail) });
  }

  private buildSecurityDailyDigestEmail(counts: { type: string; severity: string; count: number }[]): { subject: string; html: string } {
    const rows = counts
      .map((c) => `<li><strong>${EmailService.securityEventLabel(c.type)}</strong> (${c.severity}) — ${c.count}</li>`)
      .join("");
    return {
      subject: `[ResumeLingo Security] Daily summary — ${counts.reduce((sum, c) => sum + c.count, 0)} flagged event(s)`,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Security signals — last 24 hours</h2>
          <ul style="color: #475569; font-size: 14px;">${rows}</ul>
          <p style="color: #64748b; font-size: 13px;">See the full history on the Admin Console's Security Report page.</p>
        </div>
      `,
    };
  }

  /**
   * Once-daily rollup of everything logged to security_events in the last
   * 24h (see SecurityMonitorService) — critical events already triggered
   * their own immediate email above, this is a recap plus everything at
   * warning/info severity so admins aren't pinged individually for every
   * single lower-severity signal.
   */
  async sendSecurityDailyDigestEmail(to: string, counts: { type: string; severity: string; count: number }[]): Promise<void> {
    if (counts.length === 0) return;
    await this.send({ to, ...this.buildSecurityDailyDigestEmail(counts) });
  }
}
