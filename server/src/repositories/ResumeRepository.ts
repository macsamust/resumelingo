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

  findBySlug(slug: string): ResumeRecord | undefined {
    return this.db.prepare(`SELECT * FROM resumes WHERE slug = ?`).get(slug) as ResumeRecord | undefined;
  }

  findAllForUser(userId: string): ResumeRecord[] {
    return this.db
      .prepare(`SELECT * FROM resumes WHERE userId = ? ORDER BY updatedAt DESC`)
      .all(userId) as ResumeRecord[];
  }

  create(input: CreateResumeInput): ResumeRecord {
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
    this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  update(id: string, input: UpdateResumeInput): ResumeRecord | undefined {
    const existing = this.findById(id);
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
    this.updateRow(id, merged as unknown as Record<string, unknown>);
    return merged;
  }

  incrementViewCount(id: string): void {
    this.db.prepare(`UPDATE resumes SET viewCount = viewCount + 1 WHERE id = ?`).run(id);
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "resume";
}
