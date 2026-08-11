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
      .prepare(`INSERT INTO ${this.table} (${columns.map(quoteColumn).join(", ")}) VALUES (${placeholders})`)
      .bind(...columns.map((c) => toBindValue(record[c])))
      .run();
  }

  protected async updateRow(id: string, record: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(record);
    const assignments = columns.map((c) => `${quoteColumn(c)} = ?`).join(", ");
    await this.db
      .prepare(`UPDATE ${this.table} SET ${assignments} WHERE id = ?`)
      .bind(...columns.map((c) => toBindValue(record[c])), id)
      .run();
  }
}

/**
 * Double-quotes a column name so it's always parsed as an identifier, never
 * a keyword — needed for e.g. resumes."references", which would otherwise
 * collide with SQL's REFERENCES keyword. Safe (and a no-op in effect) for
 * every other column too, and D1/SQLite preserves case regardless of
 * quoting, so this never affects the camelCase names used everywhere else
 * in this codebase.
 */
function quoteColumn(column: string): string {
  return `"${column}"`;
}

/**
 * D1's `.bind()` expects primitives it can map onto SQLite's storage
 * classes (TEXT/INTEGER/REAL/BLOB/NULL) — SQLite has no native boolean
 * type, so a raw JS `true`/`false` isn't guaranteed to round-trip the same
 * way across every D1/Workers runtime version. Converting defensively here,
 * in one place, means every repository's create()/update() can keep
 * building plain boolean fields without each one having to remember to do
 * this conversion itself.
 */
function toBindValue(value: unknown): unknown {
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}
