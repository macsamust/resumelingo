import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { AchievementEntry, AwardEntry, EducationEntry, LinkVisibility, ResumeRecord, WorkExperienceEntry } from "../types";

export interface CreateResumeInput {
  userId: string;
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  photoUrl: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility: LinkVisibility;
  accessPassword: string | null;
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  generatedSummary: string;
  generatedBullets: string[];
}

export interface UpdateResumeInput {
  fullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  photoUrl?: string;
  title?: string;
  templateKey?: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
  answers?: Record<string, string>;
  experience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  achievements?: AchievementEntry[];
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
      fullName: input.fullName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      contactLinkedIn: input.contactLinkedIn,
      photoUrl: input.photoUrl,
      title: input.title,
      profession: input.profession,
      templateKey: input.templateKey,
      visibility: input.visibility,
      accessPassword: input.accessPassword,
      answers: JSON.stringify(input.answers),
      experience: JSON.stringify(input.experience),
      education: JSON.stringify(input.education),
      awards: JSON.stringify(input.awards),
      achievements: JSON.stringify(input.achievements),
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
      fullName: input.fullName ?? existing.fullName,
      contactEmail: input.contactEmail ?? existing.contactEmail,
      contactPhone: input.contactPhone ?? existing.contactPhone,
      contactLinkedIn: input.contactLinkedIn ?? existing.contactLinkedIn,
      photoUrl: input.photoUrl ?? existing.photoUrl,
      title: input.title ?? existing.title,
      templateKey: input.templateKey ?? existing.templateKey,
      visibility: input.visibility ?? existing.visibility,
      accessPassword: input.accessPassword !== undefined ? input.accessPassword : existing.accessPassword,
      answers: input.answers ? JSON.stringify(input.answers) : existing.answers,
      experience: input.experience ? JSON.stringify(input.experience) : existing.experience,
      education: input.education ? JSON.stringify(input.education) : existing.education,
      awards: input.awards ? JSON.stringify(input.awards) : existing.awards,
      achievements: input.achievements ? JSON.stringify(input.achievements) : existing.achievements,
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

  /** Admin action — deletes every resume owned by a user, e.g. right before deleting the account itself (resumes.userId has a foreign key to users). */
  async deleteAllForUser(userId: string): Promise<void> {
    await this.pool.query(`DELETE FROM resumes WHERE "userId" = $1`, [userId]);
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
