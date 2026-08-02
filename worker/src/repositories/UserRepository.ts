import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { SubscriptionTier, UserRecord } from "../types";

export class UserRepository extends BaseRepository<UserRecord> {
  protected readonly table = "users";

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<UserRecord>();
    return row ?? undefined;
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
    await this.db.prepare(`UPDATE users SET subscriptionTier = ? WHERE id = ?`).bind(tier, userId).run();
  }

  async countResumesForUser(userId: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM resumes WHERE userId = ?`)
      .bind(userId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }
}
