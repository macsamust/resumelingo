import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { SubscriptionTier, UserRecord } from "../types";

/**
 * D1 stores booleans as INTEGER 0/1 (see BaseRepository's toBindValue for
 * the write side); this normalizes "suspended" back into a proper boolean
 * before it's handed to the User model, same pattern as ResumeRepository's
 * normalizeBooleans.
 */
function normalizeBooleans(row: UserRecord): UserRecord {
  return { ...row, suspended: !!row.suspended, viewDigestOptOut: !!row.viewDigestOptOut };
}

export class UserRepository extends BaseRepository<UserRecord> {
  protected readonly table = "users";

  async findById(id: string): Promise<UserRecord | undefined> {
    const row = await super.findById(id);
    return row ? normalizeBooleans(row) : undefined;
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<UserRecord>();
    return row ? normalizeBooleans(row) : undefined;
  }

  async findAll(): Promise<UserRecord[]> {
    const rows = await super.findAll();
    return rows.map(normalizeBooleans);
  }

  async create(input: { name: string; email: string; passwordHash: string; profession: string | null }): Promise<UserRecord> {
    const record: UserRecord = {
      id: nanoid(12),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      profession: input.profession,
      subscriptionTier: SubscriptionTier.Starter,
      suspended: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date().toISOString(),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      viewDigestOptOut: false,
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  /** Profile fields only — name/email/profession. Password changes go through updatePasswordHash. */
  async update(userId: string, input: { name?: string; email?: string; profession?: string | null }): Promise<void> {
    const record = await this.findById(userId);
    if (!record) return;
    const merged = {
      name: input.name ?? record.name,
      email: input.email ?? record.email,
      profession: input.profession !== undefined ? input.profession : record.profession,
    };
    await this.db
      .prepare(`UPDATE users SET name = ?, email = ?, profession = ? WHERE id = ?`)
      .bind(merged.name, merged.email, merged.profession, userId)
      .run();
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db.prepare(`UPDATE users SET passwordHash = ? WHERE id = ?`).bind(passwordHash, userId).run();
  }

  /** Stores a new reset request, overwriting any earlier one (a fresh request invalidates the previous link). */
  async setResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET resetTokenHash = ?, resetTokenExpiresAt = ? WHERE id = ?`)
      .bind(tokenHash, expiresAt, userId)
      .run();
  }

  async findByResetTokenHash(tokenHash: string): Promise<UserRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE resetTokenHash = ?`).bind(tokenHash).first<UserRecord>();
    return row ? normalizeBooleans(row) : undefined;
  }

  /** Sets the new password and clears the reset token in one step — a used or superseded token can never be replayed. */
  async resetPassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET passwordHash = ?, resetTokenHash = NULL, resetTokenExpiresAt = NULL WHERE id = ?`)
      .bind(passwordHash, userId)
      .run();
  }

  /** Settings-page toggle (ProfilePage) and the token-verified public unsubscribe link both land here — see AuthService.setViewDigestOptOut. */
  async setViewDigestOptOut(userId: string, optOut: boolean): Promise<void> {
    await this.db.prepare(`UPDATE users SET "viewDigestOptOut" = ? WHERE id = ?`).bind(optOut ? 1 : 0, userId).run();
  }

  /**
   * Professional/Premium subscribers who haven't opted out — the recipient
   * list for ViewDigestService's weekly cron run. Tier eligibility and
   * opt-out default are both explicit product decisions (see TODO.md);
   * unpaginated since this only runs once a week off the request path, but
   * capped well above any realistic user count as a backstop against an
   * unbounded scan if that ever changes.
   */
  async findEligibleForDigest(): Promise<UserRecord[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM users
         WHERE "subscriptionTier" IN (?, ?) AND "viewDigestOptOut" = 0
         LIMIT 20000`
      )
      .bind(SubscriptionTier.Professional, SubscriptionTier.Premium)
      .all<UserRecord>();
    return results.map(normalizeBooleans);
  }

  async updateSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<void> {
    await this.db.prepare(`UPDATE users SET subscriptionTier = ? WHERE id = ?`).bind(tier, userId).run();
  }

  /** Admin action — disables/re-enables login without touching the account's data. */
  async setSuspended(userId: string, suspended: boolean): Promise<void> {
    await this.db.prepare(`UPDATE users SET suspended = ? WHERE id = ?`).bind(suspended ? 1 : 0, userId).run();
  }

  /** Bulk version of setSuspended — one statement covering every id, for the admin Users page's multi-select suspend/unsuspend. */
  async setSuspendedBulk(userIds: string[], suspended: boolean): Promise<void> {
    if (userIds.length === 0) return;
    const placeholders = userIds.map(() => "?").join(", ");
    await this.db
      .prepare(`UPDATE users SET suspended = ? WHERE id IN (${placeholders})`)
      .bind(suspended ? 1 : 0, ...userIds)
      .run();
  }

  async countResumesForUser(userId: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM resumes WHERE userId = ?`)
      .bind(userId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  /** Column (or CASE expression) each admin Users list sort key maps to — whitelisted rather than interpolating the key directly, since it goes straight into an ORDER BY clause. */
  private static readonly SORT_COLUMNS: Record<string, string> = {
    name: "u.name",
    email: "u.email",
    subscriptionTier: `CASE u.subscriptionTier WHEN 'starter' THEN 0 WHEN 'professional' THEN 1 WHEN 'premium' THEN 2 ELSE 3 END`,
    resumeCount: "resumeCount",
    suspended: "u.suspended",
    createdAt: "u.createdAt",
  };

  /**
   * One page of users plus their resume counts, optionally filtered by a
   * name/email search — used by the admin Users list. Replaces the old
   * findAllWithResumeCounts(), which still loaded every user in one go
   * (fine for the N+1 query problem, but not for the "load the whole table
   * on every page view" problem as the user base grows). Sorting and
   * filtering both happen in SQL rather than client-side, so they apply
   * across the whole table, not just the current page.
   */
  async findPageWithResumeCounts(params: {
    page: number;
    pageSize: number;
    q?: string;
    sortKey: string;
    sortDirection: "asc" | "desc";
  }): Promise<{ users: (UserRecord & { resumeCount: number })[]; total: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    const offset = (page - 1) * pageSize;
    const q = params.q?.trim();
    const where = q ? `WHERE u.name LIKE ? OR u.email LIKE ?` : "";
    const likeArgs = q ? [`%${q}%`, `%${q}%`] : [];
    const orderColumn = UserRepository.SORT_COLUMNS[params.sortKey] ?? UserRepository.SORT_COLUMNS.name;
    const orderDir = params.sortDirection === "desc" ? "DESC" : "ASC";

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as count FROM users u ${where}`)
      .bind(...likeArgs)
      .first<{ count: number }>();

    const { results } = await this.db
      .prepare(
        `SELECT u.*, COUNT(r.id) as resumeCount
         FROM users u
         LEFT JOIN resumes r ON r."userId" = u.id
         ${where}
         GROUP BY u.id
         ORDER BY ${orderColumn} ${orderDir}
         LIMIT ? OFFSET ?`
      )
      .bind(...likeArgs, pageSize, offset)
      .all<UserRecord & { resumeCount: number }>();

    return {
      users: results.map((row) => ({ ...normalizeBooleans(row), resumeCount: row.resumeCount })),
      total: countRow?.count ?? 0,
    };
  }

  /**
   * Every user matching the same search used by findPageWithResumeCounts,
   * unpaginated (up to `limit`) — backs the Users CSV export, which needs
   * the whole filtered result set rather than just the page currently on
   * screen. Capped at 5,000 rows so a very large, unfiltered export can't
   * blow past D1/Worker response limits.
   */
  async findAllWithResumeCountsMatching(params: {
    q?: string;
    sortKey: string;
    sortDirection: "asc" | "desc";
    limit?: number;
  }): Promise<(UserRecord & { resumeCount: number })[]> {
    const q = params.q?.trim();
    const where = q ? `WHERE u.name LIKE ? OR u.email LIKE ?` : "";
    const likeArgs = q ? [`%${q}%`, `%${q}%`] : [];
    const orderColumn = UserRepository.SORT_COLUMNS[params.sortKey] ?? UserRepository.SORT_COLUMNS.name;
    const orderDir = params.sortDirection === "desc" ? "DESC" : "ASC";
    const limit = Math.min(5000, Math.max(1, params.limit ?? 5000));

    const { results } = await this.db
      .prepare(
        `SELECT u.*, COUNT(r.id) as resumeCount
         FROM users u
         LEFT JOIN resumes r ON r."userId" = u.id
         ${where}
         GROUP BY u.id
         ORDER BY ${orderColumn} ${orderDir}
         LIMIT ?`
      )
      .bind(...likeArgs, limit)
      .all<UserRecord & { resumeCount: number }>();

    return results.map((row) => ({ ...normalizeBooleans(row), resumeCount: row.resumeCount }));
  }

  /** Total account count, and how many joined in the last N days — powers the admin dashboard's "Users" tile. */
  async countAll(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM users`).first<{ count: number }>();
    return row?.count ?? 0;
  }

  async countCreatedSince(isoDate: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM users WHERE createdAt >= ?`)
      .bind(isoDate)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async countSuspended(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM users WHERE suspended = 1`).first<{ count: number }>();
    return row?.count ?? 0;
  }

  /** Users grouped by tier, e.g. { starter: 40, professional: 12, premium: 5 } — zero-filled for tiers with no users. */
  async countByTier(): Promise<Record<SubscriptionTier, number>> {
    const { results } = await this.db
      .prepare(`SELECT subscriptionTier, COUNT(*) as count FROM users GROUP BY subscriptionTier`)
      .all<{ subscriptionTier: SubscriptionTier; count: number }>();
    const counts: Record<SubscriptionTier, number> = {
      [SubscriptionTier.Starter]: 0,
      [SubscriptionTier.Professional]: 0,
      [SubscriptionTier.Premium]: 0,
    };
    for (const row of results) counts[row.subscriptionTier] = row.count;
    return counts;
  }

  async findByStripeCustomerId(customerId: string): Promise<UserRecord | undefined> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE stripeCustomerId = ?`)
      .bind(customerId)
      .first<UserRecord>();
    return row ? normalizeBooleans(row) : undefined;
  }

  async setStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await this.db.prepare(`UPDATE users SET stripeCustomerId = ? WHERE id = ?`).bind(customerId, userId).run();
  }

  /** Applied only from the Stripe webhook (see SubscriptionService.handleWebhookEvent) — the single source of truth for paid tiers. */
  async applyStripeSubscription(userId: string, tier: SubscriptionTier, subscriptionId: string | null): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET subscriptionTier = ?, stripeSubscriptionId = ? WHERE id = ?`)
      .bind(tier, subscriptionId, userId)
      .run();
  }
}
