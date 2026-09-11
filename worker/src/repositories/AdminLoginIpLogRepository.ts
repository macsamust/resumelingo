import { nanoid } from "nanoid";

/**
 * Backs the IP-based rate limit on admin login (see AdminAuthController.login)
 * — a layer independent of AdminService's per-account lockout, since that
 * lockout alone doesn't stop an attacker from rotating through many admin
 * emails (or guessing at accounts that don't exist) from the same network.
 *
 * Not a BaseRepository subclass: this table has no natural "get by id"/
 * "update" access pattern, just record-a-failure and count-recent-failures.
 */
export class AdminLoginIpLogRepository {
  constructor(private readonly db: D1Database) {}

  /** Records one failed login attempt from this IP. */
  async recordFailure(ip: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO admin_login_ip_log (id, ip, "createdAt") VALUES (?, ?, ?)`)
      .bind(nanoid(12), ip, new Date().toISOString())
      .run();
  }

  /**
   * The authoritative throttle decision — see
   * PublicResumeRecruiterCodeIpLogRepository.recordFailureIfUnderLimit's doc
   * comment for the full reasoning (same check-then-write race as every
   * other IP throttle in this codebase: AdminAuthController's plain
   * countRecentFailures + recordFailure pair has a gap where two failed
   * logins landing close together can each read a stale under-the-limit
   * count before either records itself). Closed the same way: the
   * count-check and the insert happen as one atomic SQL statement. Given
   * this guards the admin console specifically, closing this is worth
   * prioritizing even though the practical exposure — a handful of extra
   * guesses slipping through under a concurrent burst — is the same modest
   * one as everywhere else this pattern appeared.
   */
  async recordFailureIfUnderLimit(ip: string, windowMinutes: number, max: number): Promise<boolean> {
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();
    const result = await this.db
      .prepare(
        `INSERT INTO admin_login_ip_log (id, ip, "createdAt")
         SELECT ?, ?, ?
         WHERE (
           SELECT COUNT(*) FROM admin_login_ip_log WHERE ip = ? AND "createdAt" >= ?
         ) < ?`
      )
      .bind(nanoid(12), ip, new Date().toISOString(), ip, since, max)
      .run();
    return result.meta.changes === 1;
  }

  /** Failed attempts from this IP (across every admin email, valid or not) in the last `windowMinutes`. */
  async countRecentFailures(ip: string, windowMinutes: number): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60000).toISOString();
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM admin_login_ip_log WHERE ip = ? AND "createdAt" >= ?`)
      .bind(ip, since)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  /**
   * Opportunistic cleanup of attempts older than the rate-limit window —
   * called alongside recordFailure so this table never grows unbounded.
   * There's no cron/scheduled trigger wired up for Workers here, so "delete
   * a little on every write" is the cheapest way to keep it bounded without
   * one.
   */
  async pruneOlderThan(windowMinutes: number): Promise<void> {
    const cutoff = new Date(Date.now() - windowMinutes * 60000).toISOString();
    await this.db.prepare(`DELETE FROM admin_login_ip_log WHERE "createdAt" < ?`).bind(cutoff).run();
  }
}
