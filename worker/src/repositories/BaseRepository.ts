/**
 * Generic CRUD base class for D1. This is the D1 counterpart of the
 * Node/Express version's BaseRepository — same shape, but every method is
 * now async (D1's driver is Promise-based) and binds use positional `?`
 * placeholders instead of better-sqlite3's named `@param` syntax.
 *
 * D1Database is per-request (it comes from `c.env.DB` inside a Worker), so
 * unlike the Express version there's no shared module-level connection —
 * each repository instance is constructed with the request's DB binding.
 */
export abstract class BaseRepository<TRecord extends { id: string }> {
  protected abstract readonly table: string;

  constructor(protected readonly db: D1Database) {}

  async findById(id: string): Promise<TRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM ${this.table} WHERE id = ?`).bind(id).first<TRecord>();
    return row ?? undefined;
  }

  async findAll(): Promise<TRecord[]> {
    const { results } = await this.db.prepare(`SELECT * FROM ${this.table}`).all<TRecord>();
    return results;
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM ${this.table} WHERE id = ?`).bind(id).run();
  }

  protected async insertRow(record: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(record);
    const placeholders = columns.map(() => "?").join(", ");
    await this.db
      .prepare(`INSERT INTO ${this.table} (${columns.join(", ")}) VALUES (${placeholders})`)
      .bind(...columns.map((c) => record[c]))
      .run();
  }

  protected async updateRow(id: string, record: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(record);
    const assignments = columns.map((c) => `${c} = ?`).join(", ");
    await this.db
      .prepare(`UPDATE ${this.table} SET ${assignments} WHERE id = ?`)
      .bind(...columns.map((c) => record[c]), id)
      .run();
  }
}
