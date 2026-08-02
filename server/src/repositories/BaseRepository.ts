import { pool } from "../db/database";

/**
 * Generic CRUD base class for Postgres (via `pg`). Concrete repositories
 * (UserRepository, ResumeRepository) extend this and only need to declare
 * their table name — insert/find/update/delete are inherited.
 *
 * Every method is async, since `pg`'s driver is Promise-based (unlike
 * better-sqlite3's synchronous API) — this mirrors the async shape already
 * used by the D1 version of these repositories in worker/. Column names are
 * double-quoted and placeholders use Postgres's positional `$1, $2, ...`
 * syntax rather than better-sqlite3's named `@param` binding.
 */
export abstract class BaseRepository<TRecord extends { id: string }> {
  protected readonly pool = pool;
  protected abstract readonly table: string;

  async findById(id: string): Promise<TRecord | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM ${this.table} WHERE "id" = $1`, [id]);
    return rows[0] as TRecord | undefined;
  }

  async findAll(): Promise<TRecord[]> {
    const { rows } = await this.pool.query(`SELECT * FROM ${this.table}`);
    return rows as TRecord[];
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.table} WHERE "id" = $1`, [id]);
  }

  protected async insertRow(record: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(record);
    const quotedColumns = columns.map((c) => `"${c}"`).join(", ");
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    await this.pool.query(
      `INSERT INTO ${this.table} (${quotedColumns}) VALUES (${placeholders})`,
      columns.map((c) => record[c])
    );
  }

  protected async updateRow(id: string, record: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(record);
    const assignments = columns.map((c, i) => `"${c}" = $${i + 1}`).join(", ");
    await this.pool.query(
      `UPDATE ${this.table} SET ${assignments} WHERE "id" = $${columns.length + 1}`,
      [...columns.map((c) => record[c]), id]
    );
  }
}
