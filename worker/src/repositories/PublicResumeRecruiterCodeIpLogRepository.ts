import { nanoid } from "nanoid";

/**
 * IP + resume-slug throttle for Recruiter Mode's access code (see
 * PublicController.unlockRecruiterCard) — exact same shape as
 * PublicResumePasswordIpLogRepository, kept as its own table (migration
 * 0042) rather than reused, so a guessing spree against one resume's
 * recruiter code and a guessing spree against that same resume's password
 * don't share (and possibly exhaust) the same failure budget.
 *
 * Not a BaseRepository subclass, same reasoning as
 * PublicResumePasswordIpLogRepository — this table has no natural "get by
 * id"/"update" access pattern.
 */
export class PublicResumeRecruiterCodeIpLogRepository {
  constructor(private readonly db: D1Database) {}

  /** Records one wrong-code attempt against this resume slug from this IP. */
  async recordFailure(ip: string, slug: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO public_resume_recruiter_code_ip_log (id, ip, slug, "createdAt") VALUES (?, ?, ?, ?)`)
      .bind(nanoid(12), ip, slug, new Date().toISOString())
      .run();
  }

  /**
   * The authoritative throttle decision — PublicController's plain
   * countRecentFailures + recordFailure pair (used elsewhere, and by this
   * class's own older methods above) has a check-then-write race: two
   * failures landing close together can each read the count *before either
   * has recorded itself*, so both get waved through even once the count is
   * already at the limit. A Sep 2026 QA run demonstrated exactly this —
   * expected the block at the 11th attempt, observed it at the 12th.
   *
   * This closes that gap by making the count-check and the insert one atomic
   * SQL statement: the INSERT's own WHERE clause re-evaluates the count
   * against this same table as part of the same statement, and SQLite
   * serializes all writes to a database, so no other write (including
   * another call to this exact method) can interleave in the middle of it.
   * Returns whether the failure was actually recorded (`changes === 1`,
   * meaning the count was still under `max` at the moment this statement
   * ran) — the caller should only report success/failure to the client
   * based on this, not on countRecentFailures' plain (and racy) read.
   */
  async recordFailureIfUnderLimit(ip: string, slug: string, windowMinutes: number, max: number): Promise<boolean> {
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();
    const result = await this.db
      .prepare(
        `INSERT INTO public_resume_recruiter_code_ip_log (id, ip, slug, "createdAt")
         SELECT ?, ?, ?, ?
         WHERE (
           SELECT COUNT(*) FROM public_resume_recruiter_code_ip_log
           WHERE ip = ? AND slug = ? AND "createdAt" >= ?
         ) < ?`
      )
      .bind(nanoid(12), ip, slug, new Date().toISOString(), ip, slug, since, max)
      .run();
    return result.meta.changes === 1;
  }

  /** Failed attempts against this slug from this IP in the last `windowMinutes`. */
  async countRecentFailures(ip: string, slug: string, windowMinutes: number): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM public_resume_recruiter_code_ip_log WHERE ip = ? AND slug = ? AND "createdAt" >= ?`)
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
    await this.db.prepare(`DELETE FROM public_resume_recruiter_code_ip_log WHERE "createdAt" < ?`).bind(cutoff).run();
  }
}
