import type BetterSqlite3 from "better-sqlite3";
import { db } from "../db/database";

/**
 * Generic CRUD base class. Concrete repositories (UserRepository,
 * ResumeRepository) extend this and only need to declare their table name
 * and record shape — insert/find/update/delete are inherited.
 */
export abstract class BaseRepository<TRecord extends { id: string }> {
  protected readonly db: BetterSqlite3.Database = db;
  protected abstract readonly table: string;

  findById(id: string): TRecord | undefined {
    const row = this.db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).get(id);
    return row as TRecord | undefined;
  }

  findAll(): TRecord[] {
    return this.db.prepare(`SELECT * FROM ${this.table}`).all() as TRecord[];
  }

  delete(id: string): void {
    this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).run(id);
  }

  protected insertRow(record: Record<string, unknown>): void {
    const columns = Object.keys(record);
    const placeholders = columns.map((c) => `@${c}`).join(", ");
    this.db
      .prepare(`INSERT INTO ${this.table} (${columns.join(", ")}) VALUES (${placeholders})`)
      .run(record);
  }

  protected updateRow(id: string, record: Record<string, unknown>): void {
    const columns = Object.keys(record);
    const assignments = columns.map((c) => `${c} = @${c}`).join(", ");
    this.db
      .prepare(`UPDATE ${this.table} SET ${assignments} WHERE id = @id`)
      .run({ ...record, id });
  }
}
