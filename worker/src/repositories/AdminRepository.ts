import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { AdminRecord } from "../types";

export class AdminRepository extends BaseRepository<AdminRecord> {
  protected readonly table = "admins";

  async findByEmail(email: string): Promise<AdminRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM admins WHERE email = ?`).bind(email).first<AdminRecord>();
    return row ?? undefined;
  }

  async create(input: { name: string; email: string; passwordHash: string }): Promise<AdminRecord> {
    const record: AdminRecord = {
      id: nanoid(12),
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  async count(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM admins`).first<{ count: number }>();
    return row?.count ?? 0;
  }

  /** Resets the failed-attempt counter and clears any lockout after a successful login. */
  async recordLoginSuccess(id: string): Promise<void> {
    await this.db
      .prepare(`UPDATE admins SET "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE id = ?`)
      .bind(id)
      .run();
  }

  /** Persists the incremented attempt count and (once the threshold is hit) the lockout expiry. */
  async recordLoginFailure(id: string, failedLoginAttempts: number, lockedUntil: string | null): Promise<void> {
    await this.db
      .prepare(`UPDATE admins SET "failedLoginAttempts" = ?, "lockedUntil" = ? WHERE id = ?`)
      .bind(failedLoginAttempts, lockedUntil, id)
      .run();
  }
}
