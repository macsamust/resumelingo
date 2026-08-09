import { nanoid } from "nanoid";
import { pool } from "../db/database";
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
 * db/database.ts's skill_suggestions table and config/skillSuggestions.ts's
 * one-time seed). No in-memory cache (unlike TemplateRepository) — this is
 * only read for a picker UI on the Edit Resume page, not a hot synchronous
 * path, so a direct query per request is simple enough.
 */
export class SkillSuggestionRepository {
  private readonly pool = pool;

  async findAll(): Promise<SkillSuggestionRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM skill_suggestions ORDER BY "professionKey" ASC, "category" ASC, "sortOrder" ASC, "label" ASC`
    );
    return result.rows;
  }

  async findByProfession(professionKey: string): Promise<SkillSuggestionRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM skill_suggestions WHERE "professionKey" = $1 ORDER BY "category" ASC, "sortOrder" ASC, "label" ASC`,
      [professionKey]
    );
    return result.rows;
  }

  async findById(id: string): Promise<SkillSuggestionRecord | undefined> {
    const result = await this.pool.query(`SELECT * FROM skill_suggestions WHERE "id" = $1`, [id]);
    return result.rows[0];
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
    await this.pool.query(
      `INSERT INTO skill_suggestions ("id", "professionKey", "label", "category", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [record.id, record.professionKey, record.label, record.category, record.sortOrder, record.createdAt, record.updatedAt]
    );
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
    await this.pool.query(
      `UPDATE skill_suggestions
       SET "professionKey" = $1, "label" = $2, "category" = $3, "sortOrder" = $4, "updatedAt" = $5
       WHERE "id" = $6`,
      [merged.professionKey, merged.label, merged.category, merged.sortOrder, merged.updatedAt, id]
    );
    return merged;
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM skill_suggestions WHERE "id" = $1`, [id]);
  }
}
