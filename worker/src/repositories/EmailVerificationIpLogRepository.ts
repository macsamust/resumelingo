import { nanoid } from "nanoid";

export type EmailVerificationIpAction = "verify" | "resend" | "password-reset" | "login";

/**
 * IP-based rate limiting for auth flows that send an email — same pattern as
 * AdminLoginIpLogRepository (record-a-hit / count-recent-hits / prune), just
 * shared across every action that needs it via the `action` column rather
 * than one table per action. Originally just verify/resend (see
 * AuthController.verifyEmail/resendVerification); password-reset (see
 * AuthController.forgotPassword) reuses the same table/class rather than
 * getting a near-duplicate one, since it's the same "throttle repeated
 * attempts from one IP" concern with a different trigger and threshold. The
 * class/table name predates that broadening — kept as-is to avoid a rename
 * migration for what's purely a naming nicety.
 *
 * "login" (see AuthController.login) reuses it too, for the same reason —
 * doesn't send an email at all, but it's the identical "throttle repeated
 * failures from one IP, failure-only like verify" shape, and this table's
 * name already stopped being literally accurate once password-reset joined
 * it.
 *
 * Not a BaseRepository subclass, same reasoning as AdminLoginIpLogRepository
 * — this table has no natural "get by id"/"update" access pattern.
 */
export class EmailVerificationIpLogRepository {
  constructor(private readonly db: D1Database) {}

  async recordAttempt(ip: string, action: EmailVerificationIpAction): Promise<void> {
    await this.db
      .prepare(`INSERT INTO email_verification_ip_log (id, ip, action, "createdAt") VALUES (?, ?, ?, ?)`)
      .bind(nanoid(12), ip, action, new Date().toISOString())
      .run();
  }

  /** Attempts of this action from this IP in the last `windowMinutes`. */
  async countRecentAttempts(ip: string, action: EmailVerificationIpAction, windowMinutes: number): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM email_verification_ip_log WHERE ip = ? AND action = ? AND "createdAt" >= ?`)
      .bind(ip, action, since)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  /**
   * Opportunistic cleanup of attempts older than the rate-limit window —
   * called alongside recordAttempt so this table never grows unbounded.
   * No cron/scheduled trigger is wired up for this (the app's one scheduled
   * job, ViewDigestService, runs weekly and has nothing to do with this
   * table), so "delete a little on every write" is the cheapest way to keep
   * it bounded without one.
   */
  async pruneOlderThan(windowMinutes: number): Promise<void> {
    const cutoff = new Date(Date.now() - windowMinutes * 60000).toISOString();
    await this.db.prepare(`DELETE FROM email_verification_ip_log WHERE "createdAt" < ?`).bind(cutoff).run();
  }
}
