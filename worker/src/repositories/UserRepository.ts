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
  return { ...row, suspended: !!row.suspended };
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

  /** Admin action — disables/re-enables login without touching the account's data. */
  async setSuspended(userId: string, suspended: boolean): Promise<void> {
    await this.db.prepare(`UPDATE users SET suspended = ? WHERE id = ?`).bind(suspended ? 1 : 0, userId).run();
  }

  async countResumesForUser(userId: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM resumes WHERE userId = ?`)
      .bind(userId)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }
}
