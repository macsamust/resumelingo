import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LinkVisibility,
  ReferenceEntry,
  ResumeRecord,
  SkillOrTool,
  WorkExperienceEntry,
} from "../types";

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
  accessPasswordExpiresAt?: string | null;
  coverLetterEnabled?: boolean;
  generatedCoverLetter?: string;
  combineExperienceFormat?: boolean;
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  skillsAndTools?: SkillOrTool[];
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
  profession?: string;
  templateKey?: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
  accessPasswordExpiresAt?: string | null;
  active?: boolean;
  coverLetterEnabled?: boolean;
  generatedCoverLetter?: string;
  recruiterModeEnabled?: boolean;
  recruiterLocation?: string;
  recruiterAvailability?: string;
  recruiterClearance?: string;
  recruiterWorkAuthorization?: string;
  recruiterExpectedSalary?: string;
  recruiterRemotePreference?: string;
  combineExperienceFormat?: boolean;
  answers?: Record<string, string>;
  experience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  achievements?: AchievementEntry[];
  skillsAndTools?: SkillOrTool[];
  referencesEnabled?: boolean;
  references?: ReferenceEntry[];
  referencesRecruiterModeOnly?: boolean;
  generatedSummary?: string;
  generatedBullets?: string[];
}

/**
 * D1 stores booleans as INTEGER 0/1 (see BaseRepository's toBindValue for
 * the write side); this normalizes a raw row read back out of D1 — where
 * those columns come back as JS numbers, not booleans — into a proper
 * ResumeRecord before it's handed to the Resume model.
 */
function normalizeBooleans(row: ResumeRecord): ResumeRecord {
  return {
    ...row,
    active: !!row.active,
    coverLetterEnabled: !!row.coverLetterEnabled,
    recruiterModeEnabled: !!row.recruiterModeEnabled,
    combineExperienceFormat: !!row.combineExperienceFormat,
    referencesEnabled: !!row.referencesEnabled,
    referencesRecruiterModeOnly: !!row.referencesRecruiterModeOnly,
  };
}

export class ResumeRepository extends BaseRepository<ResumeRecord> {
  protected readonly table = "resumes";

  async findById(id: string): Promise<ResumeRecord | undefined> {
    const row = await super.findById(id);
    return row ? normalizeBooleans(row) : undefined;
  }

  async findBySlug(slug: string): Promise<ResumeRecord | undefined> {
    const row = await this.db.prepare(`SELECT * FROM resumes WHERE slug = ?`).bind(slug).first<ResumeRecord>();
    return row ? normalizeBooleans(row) : undefined;
  }

  async findAllForUser(userId: string): Promise<ResumeRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM resumes WHERE userId = ? ORDER BY updatedAt DESC`)
      .bind(userId)
      .all<ResumeRecord>();
    return results.map(normalizeBooleans);
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
      accessPasswordExpiresAt: input.accessPasswordExpiresAt ?? null,
      active: true,
      coverLetterEnabled: input.coverLetterEnabled ?? false,
      generatedCoverLetter: input.generatedCoverLetter ?? "",
      // Recruiter Mode is only ever turned on from Edit Resume, never at
      // creation time — see ResumeService.update.
      recruiterModeEnabled: false,
      recruiterLocation: "",
      recruiterAvailability: "",
      recruiterClearance: "",
      recruiterWorkAuthorization: "",
      recruiterExpectedSalary: "",
      recruiterRemotePreference: "",
      combineExperienceFormat: input.combineExperienceFormat ?? false,
      answers: JSON.stringify(input.answers),
      experience: JSON.stringify(input.experience),
      education: JSON.stringify(input.education),
      awards: JSON.stringify(input.awards),
      achievements: JSON.stringify(input.achievements),
      skillsAndTools: JSON.stringify(input.skillsAndTools ?? []),
      // References, like Recruiter Mode, is only ever turned on from Edit
      // Resume, never at creation time.
      referencesEnabled: false,
      references: JSON.stringify([]),
      referencesRecruiterModeOnly: false,
      generatedSummary: input.generatedSummary,
      generatedBullets: JSON.stringify(input.generatedBullets),
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  /**
   * `bumpUpdatedAt` (default true) lets a caller update a resume without
   * touching "Last updated" — used by ResumeService.update for link-only
   * changes (Activate/Deactivate) that aren't a content edit, so the My
   * Resumes card's timestamp only ever reflects actual resume changes
   * (title, answers, experience, etc.), not flipping a toggle.
   */
  async update(id: string, input: UpdateResumeInput, options?: { bumpUpdatedAt?: boolean }): Promise<ResumeRecord | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;
    const bumpUpdatedAt = options?.bumpUpdatedAt ?? true;

    const merged: ResumeRecord = {
      ...existing,
      fullName: input.fullName ?? existing.fullName,
      contactEmail: input.contactEmail ?? existing.contactEmail,
      contactPhone: input.contactPhone ?? existing.contactPhone,
      contactLinkedIn: input.contactLinkedIn ?? existing.contactLinkedIn,
      photoUrl: input.photoUrl ?? existing.photoUrl,
      title: input.title ?? existing.title,
      profession: input.profession ?? existing.profession,
      templateKey: input.templateKey ?? existing.templateKey,
      visibility: input.visibility ?? existing.visibility,
      accessPassword: input.accessPassword !== undefined ? input.accessPassword : existing.accessPassword,
      accessPasswordExpiresAt:
        input.accessPasswordExpiresAt !== undefined ? input.accessPasswordExpiresAt : existing.accessPasswordExpiresAt,
      active: input.active !== undefined ? input.active : existing.active,
      coverLetterEnabled: input.coverLetterEnabled !== undefined ? input.coverLetterEnabled : existing.coverLetterEnabled,
      generatedCoverLetter: input.generatedCoverLetter !== undefined ? input.generatedCoverLetter : existing.generatedCoverLetter,
      recruiterModeEnabled: input.recruiterModeEnabled !== undefined ? input.recruiterModeEnabled : existing.recruiterModeEnabled,
      recruiterLocation: input.recruiterLocation !== undefined ? input.recruiterLocation : existing.recruiterLocation,
      recruiterAvailability: input.recruiterAvailability !== undefined ? input.recruiterAvailability : existing.recruiterAvailability,
      recruiterClearance: input.recruiterClearance !== undefined ? input.recruiterClearance : existing.recruiterClearance,
      recruiterWorkAuthorization:
        input.recruiterWorkAuthorization !== undefined ? input.recruiterWorkAuthorization : existing.recruiterWorkAuthorization,
      recruiterExpectedSalary:
        input.recruiterExpectedSalary !== undefined ? input.recruiterExpectedSalary : existing.recruiterExpectedSalary,
      recruiterRemotePreference:
        input.recruiterRemotePreference !== undefined ? input.recruiterRemotePreference : existing.recruiterRemotePreference,
      combineExperienceFormat:
        input.combineExperienceFormat !== undefined ? input.combineExperienceFormat : existing.combineExperienceFormat,
      answers: input.answers ? JSON.stringify(input.answers) : existing.answers,
      experience: input.experience ? JSON.stringify(input.experience) : existing.experience,
      education: input.education ? JSON.stringify(input.education) : existing.education,
      awards: input.awards ? JSON.stringify(input.awards) : existing.awards,
      achievements: input.achievements ? JSON.stringify(input.achievements) : existing.achievements,
      skillsAndTools: input.skillsAndTools ? JSON.stringify(input.skillsAndTools) : existing.skillsAndTools,
      referencesEnabled: input.referencesEnabled !== undefined ? input.referencesEnabled : existing.referencesEnabled,
      references: input.references ? JSON.stringify(input.references) : existing.references,
      referencesRecruiterModeOnly:
        input.referencesRecruiterModeOnly !== undefined ? input.referencesRecruiterModeOnly : existing.referencesRecruiterModeOnly,
      generatedSummary: input.generatedSummary ?? existing.generatedSummary,
      generatedBullets: input.generatedBullets ? JSON.stringify(input.generatedBullets) : existing.generatedBullets,
      updatedAt: bumpUpdatedAt ? new Date().toISOString() : existing.updatedAt,
    };
    await this.updateRow(id, merged as unknown as Record<string, unknown>);
    return merged;
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.db.prepare(`UPDATE resumes SET viewCount = viewCount + 1 WHERE id = ?`).bind(id).run();
  }

  /** Admin action — deletes every resume owned by a user, e.g. right before deleting the account itself. */
  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM resumes WHERE userId = ?`).bind(userId).run();
  }

  /**
   * Duplicates an existing resume record wholesale (experience, education,
   * achievements, Recruiter Mode, References, cover letter, etc.) rather
   * than going through create()'s narrow CreateResumeInput, which
   * deliberately zeroes those fields out for a brand-new resume — the whole
   * point of a clone is carrying them over. Only id/slug/title/templateKey
   * are regenerated; visibility/accessPassword/viewCount are reset so a
   * clone always starts as a private, unshared, unviewed draft rather than
   * silently inheriting a live public link.
   */
  async clone(source: ResumeRecord, overrides: { title: string; templateKey: string }): Promise<ResumeRecord> {
    const now = new Date().toISOString();
    const record: ResumeRecord = {
      ...source,
      id: nanoid(12),
      slug: `${slugify(overrides.title)}-${nanoid(6)}`,
      title: overrides.title,
      templateKey: overrides.templateKey,
      visibility: LinkVisibility.Private,
      accessPassword: null,
      accessPasswordExpiresAt: null,
      active: true,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
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
