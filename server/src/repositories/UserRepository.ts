import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { SubscriptionTier, UserRecord } from "../types";

export class UserRepository extends BaseRepository<UserRecord> {
  protected readonly table = "users";

  findByEmail(email: string): UserRecord | undefined {
    return this.db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRecord | undefined;
  }

  create(input: { name: string; email: string; passwordHash: string; profession: string | null }): UserRecord {
    const record: UserRecord = {
      id: nanoid(12),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      profession: input.profession,
      subscriptionTier: SubscriptionTier.Starter,
      createdAt: new Date().toISOString(),
    };
    this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  updateSubscriptionTier(userId: string, tier: SubscriptionTier): void {
    this.db.prepare(`UPDATE users SET subscriptionTier = ? WHERE id = ?`).run(tier, userId);
  }

  countResumesForUser(userId: string): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) as count FROM resumes WHERE userId = ?`)
      .get(userId) as { count: number };
    return row.count;
  }
}
