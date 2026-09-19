import { nanoid } from "nanoid";

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

/**
 * Backs SEC-A01's cookie-based session migration (see migration
 * 0049_refresh_tokens.sql's doc comment for the full reasoning). Not a
 * BaseRepository subclass — same reasoning as EmailVerificationIpLogRepository
 * and AdminLoginIpLogRepository: this table's access pattern is
 * "find by hash" / "revoke by user", not a generic by-id CRUD shape.
 */
export class RefreshTokenRepository {
  constructor(private readonly db: D1Database) {}

  async create(userId: string, tokenHash: string, expiresAt: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO refresh_tokens (id, "userId", "tokenHash", "createdAt", "expiresAt", "revokedAt") VALUES (?, ?, ?, ?, ?, NULL)`)
      .bind(nanoid(12), userId, tokenHash, new Date().toISOString(), expiresAt)
      .run();
  }

  /** Only returns a row that's neither expired nor revoked — the single check both refresh and logout need before trusting a presented token. */
  async findValidByHash(tokenHash: string): Promise<RefreshTokenRecord | undefined> {
    const row = await this.db
      .prepare(
        `SELECT * FROM refresh_tokens WHERE "tokenHash" = ? AND "revokedAt" IS NULL AND "expiresAt" > ? LIMIT 1`
      )
      .bind(tokenHash, new Date().toISOString())
      .first<RefreshTokenRecord>();
    return row ?? undefined;
  }

  /** Logout — kills this one session's refresh token without touching the user's other devices. */
  async revoke(id: string): Promise<void> {
    await this.db.prepare(`UPDATE refresh_tokens SET "revokedAt" = ? WHERE id = ?`).bind(new Date().toISOString(), id).run();
  }

  /**
   * "Log out everywhere" (password change, resetPassword, explicit
   * revokeSessions) — mirrors bumpTokenVersion's effect on already-issued
   * access-token JWTs, but for refresh tokens, which tokenVersion doesn't
   * cover (they're opaque random values, not JWTs).
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .prepare(`UPDATE refresh_tokens SET "revokedAt" = ? WHERE "userId" = ? AND "revokedAt" IS NULL`)
      .bind(new Date().toISOString(), userId)
      .run();
  }

  /**
   * Opportunistic cleanup of long-expired rows, same "delete a little on
   * every write" approach as EmailVerificationIpLogRepository.pruneOlderThan
   * — no cron is wired up for this table, so this keeps it bounded without
   * one. Called from create(), not from every read, since reads already
   * filter on expiresAt and don't need the table small to stay correct.
   */
  async pruneExpired(): Promise<void> {
    await this.db.prepare(`DELETE FROM refresh_tokens WHERE "expiresAt" < ?`).bind(new Date().toISOString()).run();
  }
}
