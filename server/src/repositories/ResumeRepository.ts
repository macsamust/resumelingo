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
    const { rows } = await this.pool.query(`SELECT * FROM resumes WHERE "slug" = $1`, [slug]);
    return rows[0] as ResumeRecord | undefined;
  }

  async findAllForUser(userId: string): Promise<ResumeRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM resumes WHERE "userId" = $1 ORDER BY "updatedAt" DESC`,
      [userId]
    );
    return rows as ResumeRecord[];
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
    await this.pool.query(`UPDATE resumes SET "viewCount" = "viewCount" + 1 WHERE "id" = $1`, [id]);
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
