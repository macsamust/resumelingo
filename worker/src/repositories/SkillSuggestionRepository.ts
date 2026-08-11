import { nanoid } from "nanoid";
import { SkillSuggestionRecord } from "../types";

export interface CreateSkillSuggestionInput {
  professionKey: string;
  label: string;
  category: "skill" | "tool";
  sortOrder?: number;
}

export interface UpdateSkillSuggestionInput {
  professionKey?: string;
  label?: string;
  category?: "skill" | "tool";
  sortOrder?: number;
}

/**
 * Admin CRUD for the "Skills & Tools" suggestion keywords (see
 * migrations/0004_admin_catalog.sql's skill_suggestions table). Reads
 * through to D1 on every call, same as TemplateRepository/PlanRepository —
 * this was never a hot synchronous path even in server/'s version (no
 * in-memory cache there either).
 */
export class SkillSuggestionRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<SkillSuggestionRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM skill_suggestions ORDER BY professionKey ASC, category ASC, sortOrder ASC, label ASC`)
      .all<SkillSuggestionRecord>();
    return results;
  }

  async findByProfession(professionKey: string): Promise<SkillSuggestionRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM skill_suggestions WHERE professionKey = ? ORDER BY category ASC, sortOrder ASC, label ASC`)
      .bind(professionKey)
      .all<SkillSuggestionRecord>();
    return results;
  }

  async findById(id: string): Promise<SkillSuggestionRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM skill_suggestions WHERE id = ?`).bind(id).first<SkillSuggestionRecord>();
    return row ?? undefined;
  }

  async create(input: CreateSkillSuggestionInput): Promise<SkillSuggestionRecord> {
    const now = new Date().toISOString();
    const record: SkillSuggestionRecord = {
      id: nanoid(12),
      professionKey: input.professionKey,
      label: input.label,
      category: input.category,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.db
      .prepare(
        `INSERT INTO skill_suggestions (id, professionKey, label, category, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(record.id, record.professionKey, record.label, record.category, record.sortOrder, record.createdAt, record.updatedAt)
      .run();
    return record;
  }

  async update(id: string, input: UpdateSkillSuggestionInput): Promise<SkillSuggestionRecord | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;
    const merged: SkillSuggestionRecord = {
      ...existing,
      professionKey: input.professionKey ?? existing.professionKey,
      label: input.label ?? existing.label,
      category: input.category ?? existing.category,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };
    await this.db
      .prepare(
        `UPDATE skill_suggestions
         SET professionKey = ?, label = ?, category = ?, sortOrder = ?, updatedAt = ?
         WHERE id = ?`
      )
      .bind(merged.professionKey, merged.label, merged.category, merged.sortOrder, merged.updatedAt, id)
      .run();
    return merged;
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM skill_suggestions WHERE id = ?`).bind(id).run();
  }
}
