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
