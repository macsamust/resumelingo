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
