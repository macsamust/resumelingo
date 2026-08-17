/**
 * Thin wrapper around Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 * Deliberately calls fetch() directly instead of pulling in Resend's SDK —
 * the API is a single plain POST, and a raw fetch call works identically in
 * both this Node process and worker/'s Cloudflare Workers runtime (see
 * worker/src/services/EmailService.ts), keeping the two implementations as
 * close to line-for-line identical as StripeService/TokenService already are.
 *
 * No email-sending capability existed anywhere in this app before this —
 * this is the first one, currently only used for password reset
 * (AuthService.requestPasswordReset). Requires a Resend account, a verified
 * sending domain, and RESEND_API_KEY / RESEND_FROM_EMAIL set in the
 * environment (see server/.env.example).
 */
export class EmailService {
  constructor(
    private readonly apiKey = process.env.RESEND_API_KEY,
    private readonly fromEmail = process.env.RESEND_FROM_EMAIL
  ) {}

  private async send(input: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      throw new Error(
        "RESEND_API_KEY / RESEND_FROM_EMAIL are not set — see server/.env.example. Email sending is not configured."
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
}
