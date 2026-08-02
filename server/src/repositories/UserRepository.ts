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
      createdAt: new Date().toISOString(),
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  async updateSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<void> {
    await this.pool.query(`UPDATE users SET "subscriptionTier" = $1 WHERE "id" = $2`, [tier, userId]);
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
