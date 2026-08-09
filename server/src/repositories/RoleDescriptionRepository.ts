import { nanoid } from "nanoid";
import { pool } from "../db/database";
import { RoleDescriptionRecord } from "../types";
import { setRoleDescriptionCache } from "../config/roleDescriptions";

export interface CreateRoleDescriptionInput {
  keywords: string[];
  category: string;
  descriptor: string;
  traits: [string, string, string];
  outcome: string;
  keyTraits: [string, string, string];
  isFallback?: boolean;
  sortOrder?: number;
}

export interface UpdateRoleDescriptionInput {
  keywords?: string[];
  category?: string;
  descriptor?: string;
  traits?: [string, string, string];
  outcome?: string;
  keyTraits?: [string, string, string];
  isFallback?: boolean;
  sortOrder?: number;
}

/** Raw shape as stored in Postgres — keywords/traits/keyTraits are JSON-serialized TEXT columns. */
interface RoleDescriptionRow {
  id: string;
  keywords: string;
  category: string;
  descriptor: string;
  traits: string;
  outcome: string;
  keyTraits: string;
  isFallback: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function fromRow(row: RoleDescriptionRow): RoleDescriptionRecord {
  return {
    id: row.id,
    keywords: JSON.parse(row.keywords || "[]"),
    category: row.category,
    descriptor: row.descriptor,
    traits: JSON.parse(row.traits || "[]"),
    outcome: row.outcome,
    keyTraits: JSON.parse(row.keyTraits || "[]"),
    isFallback: row.isFallback,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Admin CRUD for role descriptions (see db/database.ts's role_descriptions
 * table and config/roleDescriptions.ts's one-time seed + in-memory cache).
 * Every write refreshes the cache, same as TemplateRepository, since
 * findRoleDescription() reads from it synchronously on every resume save.
 */
export class RoleDescriptionRepository {
  private readonly pool = pool;

  async findAll(): Promise<RoleDescriptionRecord[]> {
    const result = await this.pool.query<RoleDescriptionRow>(
      `SELECT * FROM role_descriptions ORDER BY "sortOrder" ASC, "category" ASC`
    );
    return result.rows.map(fromRow);
  }

  async findById(id: string): Promise<RoleDescriptionRecord | undefined> {
    const result = await this.pool.query<RoleDescriptionRow>(`SELECT * FROM role_descriptions WHERE "id" = $1`, [id]);
    return result.rows[0] ? fromRow(result.rows[0]) : undefined;
  }

  async create(input: CreateRoleDescriptionInput): Promise<RoleDescriptionRecord> {
    const now = new Date().toISOString();
    const record: RoleDescriptionRecord = {
      id: nanoid(12),
      keywords: input.keywords,
      category: input.category,
      descriptor: input.descriptor,
      traits: input.traits,
      outcome: input.outcome,
      keyTraits: input.keyTraits,
      isFallback: input.isFallback ?? false,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.pool.query(
      `INSERT INTO role_descriptions
         ("id", "keywords", "category", "descriptor", "traits", "outcome", "keyTraits", "isFallback", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [
        record.id,
        JSON.stringify(record.keywords),
        record.category,
        record.descriptor,
        JSON.stringify(record.traits),
        record.outcome,
        JSON.stringify(record.keyTraits),
        record.isFallback,
        record.sortOrder,
        record.createdAt,
      ]
    );
    await this.refreshCache();
    return record;
  }

  async update(id: string, input: UpdateRoleDescriptionInput): Promise<RoleDescriptionRecord | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;
    const merged: RoleDescriptionRecord = {
      ...existing,
      keywords: input.keywords ?? existing.keywords,
      category: input.category ?? existing.category,
      descriptor: input.descriptor ?? existing.descriptor,
      traits: input.traits ?? existing.traits,
      outcome: input.outcome ?? existing.outcome,
      keyTraits: input.keyTraits ?? existing.keyTraits,
      isFallback: input.isFallback ?? existing.isFallback,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };
    await this.pool.query(
      `UPDATE role_descriptions
       SET "keywords" = $1, "category" = $2, "descriptor" = $3, "traits" = $4, "outcome" = $5,
           "keyTraits" = $6, "isFallback" = $7, "sortOrder" = $8, "updatedAt" = $9
       WHERE "id" = $10`,
      [
        JSON.stringify(merged.keywords),
        merged.category,
        merged.descriptor,
        JSON.stringify(merged.traits),
        merged.outcome,
        JSON.stringify(merged.keyTraits),
        merged.isFallback,
        merged.sortOrder,
        merged.updatedAt,
        id,
      ]
    );
    await this.refreshCache();
    return merged;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM role_descriptions WHERE "id" = $1`, [id]);
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    setRoleDescriptionCache(await this.findAll());
  }
}
