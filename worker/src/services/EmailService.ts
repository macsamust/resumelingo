/**
 * Node/Express counterpart: server/src/services/EmailService.ts (kept as
 * close to line-for-line identical as possible, same pattern as
 * StripeService/TokenService's split). Calls Resend's HTTP API directly via
 * fetch — no SDK needed, so this runs unchanged in the Workers runtime.
 *
 * Unlike server/'s version (which defaults to reading process.env),
 * everything here is wired explicitly from Env in createServices.ts, same
 * as every other worker service (Workers has no process.env).
 */
export class EmailService {
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

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
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
    });
  }

  /** Sent on register and on every email-address change (see AuthService.sendVerificationEmail) — confirms the account holder actually controls the address. Link expires in 24 hours; the settings-page/AppShell banner can trigger a fresh one via resendVerificationEmail if it lapses. */
  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "Verify your ResumeLingo email address",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Verify your email address</h2>
          <p>Confirm that this is your email address to finish setting up your ResumeLingo account. This link expires in 24 hours.</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify email address</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">If you didn't create this account or make this change, you can safely ignore this email.</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or paste this link into your browser: ${verifyUrl}</p>
        </div>
      `,
    });
  }

  /** Sent from SubscriptionService.handleWebhookEvent's "invoice.payment_failed" case — Stripe already retries the charge on its own schedule, this just makes sure the subscriber knows to update their card instead of finding out only once the subscription actually gets cancelled. */
  async sendPaymentFailedEmail(to: string, dashboardUrl: string): Promise<void> {
    await this.send({
      to,
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
    });
  }

  /**
   * Sent once, right after AuthService.register() — alongside (not instead
   * of) the verification email above, which stays focused purely on proving
   * the address. This one is the "yes, your account exists" receipt: it
   * restates the email the account is under and gives a durable link back
   * to the app, since a surprising number of signups close the tab and
   * later can't remember where they signed up. Deliberately never includes
   * a password, even a freshly-chosen one — plaintext credentials sitting
   * in an inbox indefinitely is a real security anti-pattern regardless of
   * how the account was created.
   */
  async sendWelcomeEmail(to: string, name: string, loginUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "Welcome to ResumeLingo",
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Welcome to ResumeLingo, ${name}!</h2>
          <p>Your account is set up under <strong>${to}</strong>. You can build your first resume any time from your dashboard.</p>
          <p style="margin: 24px 0;">
            <a href="${loginUrl}" style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to your dashboard</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">Check your inbox for a separate email to verify your address, if you haven't already.</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or paste this link into your browser: ${loginUrl}</p>
        </div>
      `,
    });
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
    await this.send({
      to,
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
    });
  }

  /** Weekly re-engagement digest (ViewDigestService) — "N views this week" plus a mandatory unsubscribe link (CAN-SPAM requirement for any recurring email like this). */
  async sendViewDigestEmail(to: string, input: { totalViews: number; unsubscribeUrl: string }): Promise<void> {
    const viewsLabel = input.totalViews === 1 ? "1 view" : `${input.totalViews} views`;
    await this.send({
      to,
      subject: `Your resume got ${viewsLabel} this week`,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Your weekly resume digest</h2>
          <p>Your resumes got <strong>${viewsLabel}</strong> over the past 7 days.</p>
          <p style="color: #64748b; font-size: 13px;">Log in to ResumeLingo to see the full breakdown and keep your resume up to date.</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Don't want these emails? <a href="${input.unsubscribeUrl}" style="color: #94a3b8;">Unsubscribe from the weekly digest</a>.</p>
        </div>
      `,
    });
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
    const label = EmailService.securityEventLabel(type);
    const detailRows = detail
      ? Object.entries(detail)
          .map(([k, v]) => `<li><strong>${k}:</strong> ${String(v)}</li>`)
          .join("")
      : "";
    await this.send({
      to,
      subject: `[ResumeLingo Security] ${label}`,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">${label}</h2>
          <p>The security monitor flagged this as a threshold-based signal — worth a look, not a confirmed breach.</p>
          ${detailRows ? `<ul style="color: #475569; font-size: 14px;">${detailRows}</ul>` : ""}
          <p style="color: #64748b; font-size: 13px;">See the full history on the Admin Console's Security Report page.</p>
        </div>
      `,
    });
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
    const rows = counts
      .map((c) => `<li><strong>${EmailService.securityEventLabel(c.type)}</strong> (${c.severity}) — ${c.count}</li>`)
      .join("");
    await this.send({
      to,
      subject: `[ResumeLingo Security] Daily summary — ${counts.reduce((sum, c) => sum + c.count, 0)} flagged event(s)`,
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="margin-bottom: 8px;">Security signals — last 24 hours</h2>
          <ul style="color: #475569; font-size: 14px;">${rows}</ul>
          <p style="color: #64748b; font-size: 13px;">See the full history on the Admin Console's Security Report page.</p>
        </div>
      `,
    });
  }
}
