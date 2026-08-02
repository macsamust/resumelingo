import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { LinkVisibility, ResumeRecord } from "../types";

export interface CreateResumeInput {
  userId: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility: LinkVisibility;
  accessPassword: string | null;
  answers: Record<string, string>;
  generatedSummary: string;
  generatedBullets: string[];
}

export interface UpdateResumeInput {
  title?: string;
  templateKey?: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
  answers?: Record<string, string>;
  generatedSummary?: string;
  generatedBullets?: string[];
}

export class ResumeRepository extends BaseRepository<ResumeRecord> {
  protected readonly table = "resumes";

  async findBySlug(slug: string): Promise<ResumeRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM resumes WHERE slug = ?`).bind(slug).first<ResumeRecord>();
    return row ?? undefined;
  }

  async findAllForUser(userId: string): Promise<ResumeRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM resumes WHERE userId = ? ORDER BY updatedAt DESC`)
      .bind(userId)
      .all<ResumeRecord>();
    return results;
  }

  async create(input: CreateResumeInput): Promise<ResumeRecord> {
    const now = new Date().toISOString();
    const record: ResumeRecord = {
      id: nanoid(12),
      userId: input.userId,
      slug: `${slugify(input.title)}-${nanoid(6)}`,
      title: input.title,
      profession: input.profession,
      templateKey: input.templateKey,
      visibility: input.visibility,
      accessPassword: input.accessPassword,
      answers: JSON.stringify(input.answers),
      generatedSummary: input.generatedSummary,
      generatedBullets: JSON.stringify(input.generatedBullets),
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  async update(id: string, input: UpdateResumeInput): Promise<ResumeRecord | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const merged: ResumeRecord = {
      ...existing,
      title: input.title ?? existing.title,
      templateKey: input.templateKey ?? existing.templateKey,
      visibility: input.visibility ?? existing.visibility,
      accessPassword: input.accessPassword !== undefined ? input.accessPassword : existing.accessPassword,
      answers: input.answers ? JSON.stringify(input.answers) : existing.answers,
      generatedSummary: input.generatedSummary ?? existing.generatedSummary,
      generatedBullets: input.generatedBullets ? JSON.stringify(input.generatedBullets) : existing.generatedBullets,
      updatedAt: new Date().toISOString(),
    };
    await this.updateRow(id, merged as unknown as Record<string, unknown>);
    return merged;
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.db.prepare(`UPDATE resumes SET viewCount = viewCount + 1 WHERE id = ?`).bind(id).run();
  }
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "resume"
  );
}
