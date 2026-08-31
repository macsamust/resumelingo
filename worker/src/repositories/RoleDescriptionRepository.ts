import { nanoid } from "nanoid";
import { RoleDescriptionRecord } from "../types";

export interface CreateRoleDescriptionInput {
  keywords: string[];
  category: string;
  descriptor: string;
  traits: [string, string, string];
  outcome: string;
  keyTraits: [string, string, string];
  isFallback?: boolean;
  /** Set to match this row directly to one of config/professions.ts's keys instead of via keyword. */
  professionKey?: string | null;
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
  /** undefined = leave unchanged; null = explicitly clear back to a keyword-matched/fallback row. */
  professionKey?: string | null;
  sortOrder?: number;
}

/** Raw shape as stored in D1 — keywords/traits/keyTraits are JSON-serialized TEXT columns, isFallback is INTEGER 0/1. */
interface RoleDescriptionRow {
  id: string;
  keywords: string;
  category: string;
  descriptor: string;
  traits: string;
  outcome: string;
  keyTraits: string;
  isFallback: number;
  professionKey: string | null;
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
    isFallback: !!row.isFallback,
    professionKey: row.professionKey,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Admin CRUD for role descriptions (see migrations/0004_admin_catalog.sql's
 * role_descriptions table). UNLIKE server/'s version (which refreshes an
 * in-memory cache on every write because findRoleDescription() is called
 * synchronously on every resume save), this reads through to D1 on every
 * call — ContentGenerator's findRoleDescription()/findRoleDescriptionForProfession()
 * are now async and call this repository directly. See
 * migrations/0004_admin_catalog.sql for the fuller "no cross-isolate cache"
 * rationale.
 */
export class RoleDescriptionRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<RoleDescriptionRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM role_descriptions ORDER BY sortOrder ASC, category ASC`)
      .all<RoleDescriptionRow>();
    return results.map(fromRow);
  }

  async findById(id: string): Promise<RoleDescriptionRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM role_descriptions WHERE id = ?`).bind(id).first<RoleDescriptionRow>();
    return row ? fromRow(row) : undefined;
  }

  /**
   * Case-insensitive substring match against a role string — the "Other"
   * profession's About-statement voice (see ContentGenerator.buildOtherSummary).
   * Excludes professionKey-matched and fallback rows, same rule as
   * server/'s findRoleDescription(). Falls back to the single isFallback
   * row, or to an unconditional generic row if the table is somehow empty
   * (fresh D1 instance before the seed migration ran).
   */
  async findByRole(role: string): Promise<RoleDescriptionRecord> {
    const all = await this.findAll();
    const lower = role.toLowerCase();
    const matched = all.find((r) => !r.isFallback && !r.professionKey && r.keywords.some((k) => lower.includes(k)));
    if (matched) return matched;
    const fallback = all.find((r) => r.isFallback);
    if (fallback) return fallback;
    return {
      id: "generic-fallback",
      keywords: [],
      category: "professional",
      descriptor: "dedicated, results oriented individual",
      traits: ["clear communication", "sound judgment", "steady followthrough"],
      outcome: "consistently deliver strong results",
      keyTraits: ["adaptability", "attention to detail", "a strong work ethic"],
      isFallback: true,
      professionKey: null,
      sortOrder: 0,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  }

  /**
   * Looks up the row matched directly to a named profession, used by
   * ContentGenerator.buildSummary for every profession except "Other".
   * Returns undefined (rather than falling back to the generic row) so the
   * caller can fall back to its own older sentence template.
   */
  async findByProfessionKey(professionKey: string): Promise<RoleDescriptionRecord | undefined> {
    const row = await this.db
      .prepare(`SELECT * FROM role_descriptions WHERE professionKey = ?`)
      .bind(professionKey)
      .first<RoleDescriptionRow>();
    return row ? fromRow(row) : undefined;
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
      professionKey: input.professionKey ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.db
      .prepare(
        `INSERT INTO role_descriptions
           (id, keywords, category, descriptor, traits, outcome, keyTraits, isFallback, professionKey, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.id,
        JSON.stringify(record.keywords),
        record.category,
        record.descriptor,
        JSON.stringify(record.traits),
        record.outcome,
        JSON.stringify(record.keyTraits),
        record.isFallback ? 1 : 0,
        record.professionKey,
        record.sortOrder,
        record.createdAt,
        record.updatedAt
      )
      .run();
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
      professionKey: input.professionKey !== undefined ? input.professionKey : existing.professionKey,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };
    await this.db
      .prepare(
        `UPDATE role_descriptions
         SET keywords = ?, category = ?, descriptor = ?, traits = ?, outcome = ?,
             keyTraits = ?, isFallback = ?, professionKey = ?, sortOrder = ?, updatedAt = ?
         WHERE id = ?`
      )
      .bind(
        JSON.stringify(merged.keywords),
        merged.category,
        merged.descriptor,
        JSON.stringify(merged.traits),
        merged.outcome,
        JSON.stringify(merged.keyTraits),
        merged.isFallback ? 1 : 0,
        merged.professionKey,
        merged.sortOrder,
        merged.updatedAt,
        id
      )
      .run();
    return merged;
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM role_descriptions WHERE id = ?`).bind(id).run();
  }
}
