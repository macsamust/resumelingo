import { pool } from "../db/database";
import { TemplateCategory, TemplateRecord } from "../types";
import { setTemplateCache } from "../config/templates";

export interface CreateTemplateInput {
  key: string;
  name: string;
  description: string;
  category?: TemplateCategory;
  enabled?: boolean;
  sortOrder?: number;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  enabled?: boolean;
  sortOrder?: number;
}

/**
 * Full CRUD for the "templates" table. Doesn't extend BaseRepository since
 * templates are keyed by "key" (a slug), not "id". Every write refreshes
 * the in-memory cache in config/templates.ts so the rest of the app (Resume
 * model, the public /api/templates list) sees the change immediately
 * without a redeploy or restart.
 */
export class TemplateRepository {
  private readonly pool = pool;

  async findAll(): Promise<TemplateRecord[]> {
    const { rows } = await this.pool.query(`SELECT * FROM templates ORDER BY "sortOrder" ASC, "name" ASC`);
    return rows as TemplateRecord[];
  }

  async findByKey(key: string): Promise<TemplateRecord | undefined> {
    const { rows } = await this.pool.query(`SELECT * FROM templates WHERE "key" = $1`, [key]);
    return rows[0] as TemplateRecord | undefined;
  }

  async create(input: CreateTemplateInput): Promise<TemplateRecord> {
    const now = new Date().toISOString();
    const record: TemplateRecord = {
      key: input.key,
      name: input.name,
      description: input.description,
      category: input.category ?? TemplateCategory.Basic,
      enabled: input.enabled ?? true,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.pool.query(
      `INSERT INTO templates ("key", "name", "description", "category", "enabled", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [record.key, record.name, record.description, record.category, record.enabled, record.sortOrder, now]
    );
    await this.refreshCache();
    return record;
  }

  async update(key: string, input: UpdateTemplateInput): Promise<TemplateRecord | undefined> {
    const existing = await this.findByKey(key);
    if (!existing) return undefined;
    const merged: TemplateRecord = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      enabled: input.enabled ?? existing.enabled,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };
    await this.pool.query(
      `UPDATE templates SET "name" = $1, "description" = $2, "category" = $3, "enabled" = $4, "sortOrder" = $5, "updatedAt" = $6 WHERE "key" = $7`,
      [merged.name, merged.description, merged.category, merged.enabled, merged.sortOrder, merged.updatedAt, key]
    );
    await this.refreshCache();
    return merged;
  }

  async delete(key: string): Promise<void> {
    await this.pool.query(`DELETE FROM templates WHERE "key" = $1`, [key]);
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    setTemplateCache(await this.findAll());
  }
}
