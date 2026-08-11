import { TemplateCategory, TemplateRecord } from "../types";

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

function normalizeBooleans(row: TemplateRecord): TemplateRecord {
  return { ...row, enabled: !!row.enabled };
}

/**
 * Full CRUD for the "templates" table. Doesn't extend BaseRepository since
 * templates are keyed by "key" (a slug), not "id" — same as server/'s
 * TemplateRepository.
 *
 * UNLIKE server/ (which refreshes an in-memory cache on every write — see
 * server/src/config/templates.ts — because Node's long-lived process can
 * share that cache across every request), every method here reads through
 * to D1 directly: a Worker has no shared module-level state across
 * isolates, so there is no correct in-memory cache to refresh. See
 * migrations/0004_admin_catalog.sql for the fuller rationale. Callers
 * (TemplateController, Resume model via ResumeService) simply await this
 * repository instead of reading a synchronous cache.
 */
export class TemplateRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<TemplateRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM templates ORDER BY sortOrder ASC, name ASC`)
      .all<TemplateRecord>();
    return results.map(normalizeBooleans);
  }

  async findByKey(key: string): Promise<TemplateRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM templates WHERE "key" = ?`).bind(key).first<TemplateRecord>();
    return row ? normalizeBooleans(row) : undefined;
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
    await this.db
      .prepare(
        `INSERT INTO templates ("key", name, description, category, enabled, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(record.key, record.name, record.description, record.category, record.enabled ? 1 : 0, record.sortOrder, now, now)
      .run();
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
    await this.db
      .prepare(
        `UPDATE templates SET name = ?, description = ?, category = ?, enabled = ?, sortOrder = ?, updatedAt = ? WHERE "key" = ?`
      )
      .bind(merged.name, merged.description, merged.category, merged.enabled ? 1 : 0, merged.sortOrder, merged.updatedAt, key)
      .run();
    return merged;
  }

  async delete(key: string): Promise<void> {
    await this.db.prepare(`DELETE FROM templates WHERE "key" = ?`).bind(key).run();
  }
}
