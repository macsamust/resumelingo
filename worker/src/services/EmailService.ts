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
          <p style="color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or paste this link into your browser: ${resetUrl}</p>
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
}
