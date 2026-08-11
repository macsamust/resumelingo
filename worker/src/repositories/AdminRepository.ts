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
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  async count(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM admins`).first<{ count: number }>();
    return row?.count ?? 0;
  }
}
