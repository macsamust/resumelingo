import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { AdminRecord } from "../types";

export class AdminRepository extends BaseRepository<AdminRecord> {
  protected readonly table = "admins";

  async findByEmail(email: string): Promise<AdminRecord | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM admins WHERE "email" = $1`, [email]);
    return rows[0] as AdminRecord | undefined;
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
    const { rows } = await this.pool.query(`SELECT COUNT(*)::int as count FROM admins`);
    return rows[0]?.count ?? 0;
  }
}
