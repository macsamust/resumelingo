import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { SubscriptionTier, UserRecord } from "../types";

export class UserRepository extends BaseRepository<UserRecord> {
  protected readonly table = "users";

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM users WHERE "email" = $1`, [email]);
    return rows[0] as UserRecord | undefined;
  }

  async create(input: { name: string; email: string; passwordHash: string; profession: string | null }): Promise<UserRecord> {
    const record: UserRecord = {
      id: nanoid(12),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      profession: input.profession,
      subscriptionTier: SubscriptionTier.Starter,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      suspended: false,
      createdAt: new Date().toISOString(),
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
    await this.pool.query(
      `UPDATE users SET "name" = $1, "email" = $2, "profession" = $3 WHERE "id" = $4`,
      [merged.name, merged.email, merged.profession, userId]
    );
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.pool.query(`UPDATE users SET "passwordHash" = $1 WHERE "id" = $2`, [passwordHash, userId]);
  }

  /**
   * Direct tier change with no billing behind it. Kept for admin/manual use
   * and for downgrading to Starter; paid-tier upgrades should go through
   * Stripe Checkout (see SubscriptionService.createCheckoutSession) so the
   * tier only actually changes once Stripe confirms payment via webhook.
   */
  async updateSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<void> {
    await this.pool.query(`UPDATE users SET "subscriptionTier" = $1 WHERE "id" = $2`, [tier, userId]);
  }

  /** Admin action — disables/re-enables login without touching the account's data. */
  async setSuspended(userId: string, suspended: boolean): Promise<void> {
    await this.pool.query(`UPDATE users SET "suspended" = $1 WHERE "id" = $2`, [suspended, userId]);
  }

  async findByStripeCustomerId(customerId: string): Promise<UserRecord | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM users WHERE "stripeCustomerId" = $1`, [customerId]);
    return rows[0] as UserRecord | undefined;
  }

  async setStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await this.pool.query(`UPDATE users SET "stripeCustomerId" = $1 WHERE "id" = $2`, [customerId, userId]);
  }

  /** Applied only from the Stripe webhook — the single source of truth for paid tiers. */
  async applyStripeSubscription(
    userId: string,
    tier: SubscriptionTier,
    subscriptionId: string | null
  ): Promise<void> {
    await this.pool.query(
      `UPDATE users SET "subscriptionTier" = $1, "stripeSubscriptionId" = $2 WHERE "id" = $3`,
      [tier, subscriptionId, userId]
    );
  }

  async countResumesForUser(userId: string): Promise<number> {
    // COUNT(*) comes back as a bigint (stringified) from pg by default;
    // casting to ::int keeps this a plain JS number, matching the D1 version.
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM resumes WHERE "userId" = $1`,
      [userId]
    );
    return rows[0]?.count ?? 0;
  }
}
