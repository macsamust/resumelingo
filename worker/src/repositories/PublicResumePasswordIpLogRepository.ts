import { nanoid } from "nanoid";

/**
 * IP + resume-slug throttle for password-protected public resume links (see
 * PublicController.getBySlug) — same record-a-failure/count-recent-failures/
 * prune shape as AdminLoginIpLogRepository, just keyed by (ip, slug) instead
 * of ip alone. Keyed by slug too because the attacker's goal here is
 * guessing one specific resume's password, not raw request volume — a
 * blanket per-IP count (like AdminLoginIpLogRepository's) would also
 * throttle someone innocently mistyping their own resume's password
 * repeatedly, which isn't the concern this guards against.
 *
 * Not a BaseRepository subclass, same reasoning as AdminLoginIpLogRepository
 * — this table has no natural "get by id"/"update" access pattern.
 */
export class PublicResumePasswordIpLogRepository {
  constructor(private readonly db: D1Database) {}

  /** Records one wrong-password attempt against this resume slug from this IP. */
  async recordFailure(ip: string, slug: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO public_resume_password_ip_log (id, ip, slug, "createdAt") VALUES (?, ?, ?, ?)`)
      .bind(nanoid(12), ip, slug, new Date().toISOString())
      .run();
  }

  /** Failed attempts against this slug from this IP in the last `windowMinutes`. */
  async countRecentFailures(ip: string, slug: string, windowMinutes: number): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM public_resume_password_ip_log WHERE ip = ? AND slug = ? AND "createdAt" >= ?`)
      .bind(ip, slug, since)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  /**
   * Opportunistic cleanup of attempts older than the rate-limit window —
   * called alongside recordFailure so this table never grows unbounded. No
   * cron/scheduled trigger is wired up for this specifically, same "delete a
   * little on every write" reasoning as the other IP-log repositories.
   */
  async pruneOlderThan(windowMinutes: number): Promise<void> {
    const cutoff = new Date(Date.now() - windowMinutes * 60000).toISOString();
    await this.db.prepare(`DELETE FROM public_resume_password_ip_log WHERE "createdAt" < ?`).bind(cutoff).run();
  }
}
