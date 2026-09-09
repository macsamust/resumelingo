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
  return {
    ...row,
    suspended: !!row.suspended,
    viewDigestOptOut: !!row.viewDigestOptOut,
    emailVerified: !!row.emailVerified,
    paymentFailed: !!row.paymentFailed,
    cancelAtPeriodEnd: !!row.cancelAtPeriodEnd,
    resumeRefreshOptOut: !!row.resumeRefreshOptOut,
  };
}

export class UserRepository extends BaseRepository<UserRecord> {
  protected readonly table = "users";

  async findById(id: string): Promise<UserRecord | undefined> {
    const row = await super.findById(id);
    return row ? normalizeBooleans(row) : undefined;
  }

  /**
   * Case-insensitive on purpose — matches on LOWER(email) rather than a raw
   * `=` comparison, so `Foo@Example.com` and `foo@example.com` resolve to
   * the same account regardless of how either was typed. Every write path
   * (register/updateProfile in AuthService) also lowercases before storing,
   * so this is defense-in-depth against any row that predates that
   * normalization rather than the only thing making it work.
   */
  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`).bind(email).first<UserRecord>();
    return row ? normalizeBooleans(row) : undefined;
  }

  async findAll(): Promise<UserRecord[]> {
    const rows = await super.findAll();
    return rows.map(normalizeBooleans);
  }

  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
    profession: string | null;
    /** Null when the caller didn't confirm acceptance — AuthService.register is expected to reject registration before ever reaching here, but this stays nullable rather than required so it fails closed (no timestamp) instead of failing to compile if a future caller forgets to pass it. */
    termsAcceptedAt: string | null;
    termsVersion: string | null;
  }): Promise<UserRecord> {
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
      // New accounts start unverified — see migration 0017's comment on why
      // existing accounts were grandfathered to true instead.
      emailVerified: false,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
      paymentFailed: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      // Matches the column's own DEFAULT 120 (migration 0037) — set
      // explicitly here too since insertRow writes every column named in
      // this object, not just the ones an admin/migration seeded.
      resumeRefreshCadenceDays: 120,
      resumeRefreshOptOut: false,
      staleAccountWarnedAt: null,
      suspensionReason: null,
      termsAcceptedAt: input.termsAcceptedAt,
      termsVersion: input.termsVersion,
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

  /** Stores a new verification request, overwriting any earlier one — same pattern as setResetToken. Called on register and on every email-address change. */
  async setVerificationToken(userId: string, tokenHash: string, expiresAt: string): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET "verificationTokenHash" = ?, "verificationTokenExpiresAt" = ? WHERE id = ?`)
      .bind(tokenHash, expiresAt, userId)
      .run();
  }

  async findByVerificationTokenHash(tokenHash: string): Promise<UserRecord | undefined> {
    const row = await this.db
      .prepare(`SELECT * FROM users WHERE "verificationTokenHash" = ?`)
      .bind(tokenHash)
      .first<UserRecord>();
    return row ? normalizeBooleans(row) : undefined;
  }

  /** Marks the address verified and clears the token in one step — a used or superseded token can never be replayed, same as resetPassword. */
  /**
   * Also lifts a system-initiated suspension (suspensionReason ===
   * "unverified_email") since that's the one thing this exact action fixes.
   * Deliberately leaves an admin-initiated suspension (suspensionReason
   * null) untouched — verifying your email doesn't undo a real abuse
   * suspension that happens to be in effect for an unrelated reason.
   */
  async confirmEmailVerification(userId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE users
         SET "emailVerified" = 1,
             "verificationTokenHash" = NULL,
             "verificationTokenExpiresAt" = NULL,
             suspended = CASE WHEN "suspensionReason" = 'unverified_email' THEN 0 ELSE suspended END,
             "suspensionReason" = CASE WHEN "suspensionReason" = 'unverified_email' THEN NULL ELSE "suspensionReason" END
         WHERE id = ?`
      )
      .bind(userId)
      .run();
  }

  /** Flips emailVerified back to false without touching any pending token — called from updateProfile whenever the address itself changes, since a fresh setVerificationToken call always follows immediately after. */
  async setEmailUnverified(userId: string): Promise<void> {
    await this.db.prepare(`UPDATE users SET "emailVerified" = 0 WHERE id = ?`).bind(userId).run();
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

  /** Same Profile "Email preferences" section as setViewDigestOptOut above — see AuthService.setResumeRefreshCadenceDays for the allowed-value check (60/120/360). */
  async setResumeRefreshCadenceDays(userId: string, days: number): Promise<void> {
    await this.db.prepare(`UPDATE users SET "resumeRefreshCadenceDays" = ? WHERE id = ?`).bind(days, userId).run();
  }

  /** Separate on/off switch from the cadence value above — same pattern as setViewDigestOptOut. */
  async setResumeRefreshOptOut(userId: string, optOut: boolean): Promise<void> {
    await this.db.prepare(`UPDATE users SET "resumeRefreshOptOut" = ? WHERE id = ?`).bind(optOut ? 1 : 0, userId).run();
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

  /**
   * Accounts due the stale-account warning email — unverified, zero
   * resumes, older than `warnAfterHours`, never warned before, and created
   * on or after `protectedBeforeIso` (see StaleAccountCleanupService's doc
   * comment for both the "zero resumes" reasoning and why every account
   * that predates this feature's rollout is grandfathered in rather than
   * retroactively swept up — same precedent as migration 0017 grandfathering
   * emailVerified for pre-existing accounts). The `NOT EXISTS` subquery
   * against resumes is cheap: both tables are small relative to most SaaS
   * user tables, and this only runs once an hour.
   */
  /** Unverified, zero-resume accounts past `suspendAfterHours` old that haven't already been system-suspended — the pool StaleAccountCleanupService's suspend pass acts on. */
  async findEligibleForSuspension(suspendAfterHours: number, protectedBeforeIso: string): Promise<UserRecord[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM users
         WHERE "emailVerified" = 0
           AND "staleAccountWarnedAt" IS NULL
           AND datetime("createdAt") <= datetime('now', ?)
           AND datetime("createdAt") >= datetime(?)
           AND NOT EXISTS (SELECT 1 FROM resumes WHERE resumes."userId" = users.id)
         LIMIT 20000`
      )
      .bind(`-${suspendAfterHours} hours`, protectedBeforeIso)
      .all<UserRecord>();
    return results.map(normalizeBooleans);
  }

  /** Marks a user as system-suspended for an unverified email — sets `suspended`, `suspensionReason`, and (reusing the existing column) `staleAccountWarnedAt` as the "already processed by this job" marker so it isn't picked up again. */
  async suspendForUnverifiedEmail(userId: string, isoDate: string): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET suspended = 1, "suspensionReason" = 'unverified_email', "staleAccountWarnedAt" = ? WHERE id = ?`)
      .bind(isoDate, userId)
      .run();
  }

  /**
   * Accounts due actual deletion — same unverified + zero-resumes +
   * post-rollout-cutoff signal as the suspend query, past `deleteAfterHours`
   * instead. Deliberately not conditioned on the account having already been
   * suspended: if the suspend job somehow missed a run, the account still
   * gets deleted on schedule rather than silently living forever — the
   * suspend step is a courtesy/recovery window, not a precondition.
   */
  async findEligibleForStalePurge(deleteAfterHours: number, protectedBeforeIso: string): Promise<UserRecord[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM users
         WHERE "emailVerified" = 0
           AND datetime("createdAt") <= datetime('now', ?)
           AND datetime("createdAt") >= datetime(?)
           AND NOT EXISTS (SELECT 1 FROM resumes WHERE resumes."userId" = users.id)
         LIMIT 20000`
      )
      .bind(`-${deleteAfterHours} hours`, protectedBeforeIso)
      .all<UserRecord>();
    return results.map(normalizeBooleans);
  }

  async updateSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<void> {
    await this.db.prepare(`UPDATE users SET subscriptionTier = ? WHERE id = ?`).bind(tier, userId).run();
  }

  /** Admin action — disables/re-enables login without touching the account's data. */
  /** Admin-driven suspend/unsuspend — always clears `suspensionReason` since this is a fresh, explicit admin decision that supersedes whatever set the flag before (including a prior system suspension). */
  async setSuspended(userId: string, suspended: boolean): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET suspended = ?, "suspensionReason" = NULL WHERE id = ?`)
      .bind(suspended ? 1 : 0, userId)
      .run();
  }

  /** Bulk version of setSuspended — one statement covering every id, for the admin Users page's multi-select suspend/unsuspend. */
  async setSuspendedBulk(userIds: string[], suspended: boolean): Promise<void> {
    if (userIds.length === 0) return;
    const placeholders = userIds.map(() => "?").join(", ");
    await this.db
      .prepare(`UPDATE users SET suspended = ?, "suspensionReason" = NULL WHERE id IN (${placeholders})`)
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
    lastActivityAt: "lastActivityAt",
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
  }): Promise<{ users: (UserRecord & { resumeCount: number; lastActivityAt: string | null })[]; total: number }> {
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
        `SELECT u.*, COUNT(r.id) as resumeCount, MAX(r."updatedAt") as lastActivityAt
         FROM users u
         LEFT JOIN resumes r ON r."userId" = u.id
         ${where}
         GROUP BY u.id
         ORDER BY ${orderColumn} ${orderDir}
         LIMIT ? OFFSET ?`
      )
      .bind(...likeArgs, pageSize, offset)
      .all<UserRecord & { resumeCount: number; lastActivityAt: string | null }>();

    return {
      users: results.map((row) => ({ ...normalizeBooleans(row), resumeCount: row.resumeCount, lastActivityAt: row.lastActivityAt })),
      total: countRow?.count ?? 0,
    };
  }

  /**
   * Every user matching the same search used by findPageWithResumeCounts,
   * unpaginated (up to `limit`) — backs the Users CSV export, which needs
   * the whole filtered result set rather than just the page currently on
   * screen. Capped at 5,000 rows so a very large, unfiltered export can't
   * blow past D1/Worker response limits.
   *
   * `ids`, when given, restricts the export to exactly those accounts —
   * the admin Users page's "select rows via checkbox, then Export CSV"
   * custom-report flow (see AdminUsersPage's selected state and
   * AdminUserController.exportCsv). Takes priority over `q`: an explicit
   * row selection is a stronger signal of intent than the text search that
   * was used to find those rows in the first place, so it isn't
   * re-filtered by it.
   */
  async findAllWithResumeCountsMatching(params: {
    q?: string;
    ids?: string[];
    sortKey: string;
    sortDirection: "asc" | "desc";
    limit?: number;
  }): Promise<(UserRecord & { resumeCount: number; lastActivityAt: string | null })[]> {
    const q = params.q?.trim();
    const ids = params.ids?.filter((id) => id.trim() !== "");
    const orderColumn = UserRepository.SORT_COLUMNS[params.sortKey] ?? UserRepository.SORT_COLUMNS.name;
    const orderDir = params.sortDirection === "desc" ? "DESC" : "ASC";
    const limit = Math.min(5000, Math.max(1, params.limit ?? 5000));

    let where = "";
    let whereArgs: string[] = [];
    if (ids && ids.length > 0) {
      where = `WHERE u.id IN (${ids.map(() => "?").join(",")})`;
      whereArgs = ids;
    } else if (q) {
      where = `WHERE u.name LIKE ? OR u.email LIKE ?`;
      whereArgs = [`%${q}%`, `%${q}%`];
    }

    const { results } = await this.db
      .prepare(
        `SELECT u.*, COUNT(r.id) as resumeCount, MAX(r."updatedAt") as lastActivityAt
         FROM users u
         LEFT JOIN resumes r ON r."userId" = u.id
         ${where}
         GROUP BY u.id
         ORDER BY ${orderColumn} ${orderDir}
         LIMIT ?`
      )
      .bind(...whereArgs, limit)
      .all<UserRecord & { resumeCount: number; lastActivityAt: string | null }>();

    return results.map((row) => ({ ...normalizeBooleans(row), resumeCount: row.resumeCount, lastActivityAt: row.lastActivityAt }));
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

  /** Signups within a bounded window (`[fromIso, toIso)`) — unlike countCreatedSince (open-ended, "since X"), this is what the admin dashboard's trend arrows use to compare one period against the equal-length period immediately before it. */
  async countCreatedBetween(fromIso: string, toIso: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM users WHERE createdAt >= ? AND createdAt < ?`)
      .bind(fromIso, toIso)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  async countSuspended(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM users WHERE suspended = 1`).first<{ count: number }>();
    return row?.count ?? 0;
  }

  /** Accounts currently mid-failed-renewal (see SubscriptionService.notifyPaymentFailure) — feeds the admin dashboard's payment-health tile. */
  async countPaymentFailed(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM users WHERE paymentFailed = 1`).first<{ count: number }>();
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

  /**
   * Applied only from the Stripe webhook (see SubscriptionService.syncSubscription)
   * — the single source of truth for paid tiers. Also mirrors
   * cancel_at_period_end/current_period_end from the same Stripe subscription
   * object, so a person's account reflects a scheduled (not yet effective)
   * cancellation, not just "still active" vs. "gone."
   */
  async applyStripeSubscription(
    userId: string,
    tier: SubscriptionTier,
    subscriptionId: string | null,
    cancelAtPeriodEnd: boolean,
    currentPeriodEnd: string | null
  ): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET subscriptionTier = ?, stripeSubscriptionId = ?, cancelAtPeriodEnd = ?, currentPeriodEnd = ? WHERE id = ?`)
      .bind(tier, subscriptionId, cancelAtPeriodEnd ? 1 : 0, currentPeriodEnd, userId)
      .run();
  }

  /**
   * Sets cancelAtPeriodEnd/currentPeriodEnd immediately after a self-service
   * cancel/resume call to Stripe (see SubscriptionService.cancelSubscription/
   * resumeSubscription) — Stripe's own subscription.updated webhook will
   * apply the identical values moments later via applyStripeSubscription
   * above, but updating here too means the person's own request reflects
   * the change right away instead of waiting on a webhook round-trip.
   */
  async setCancelAtPeriodEnd(userId: string, cancelAtPeriodEnd: boolean, currentPeriodEnd: string | null): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET cancelAtPeriodEnd = ?, currentPeriodEnd = ? WHERE id = ?`)
      .bind(cancelAtPeriodEnd ? 1 : 0, currentPeriodEnd, userId)
      .run();
  }

  /** Set true on invoice.payment_failed, cleared back to false on the next invoice.paid — see SubscriptionService.handleWebhookEvent. */
  async setPaymentFailed(userId: string, failed: boolean): Promise<void> {
    await this.db.prepare(`UPDATE users SET paymentFailed = ? WHERE id = ?`).bind(failed ? 1 : 0, userId).run();
  }
}
