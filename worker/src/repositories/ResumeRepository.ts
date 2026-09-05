import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import {
  AchievementEntry,
  AwardEntry,
  EducationEntry,
  LanguageEntry,
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
  languages?: LanguageEntry[];
  generatedSummary: string;
  generatedBullets: string[];
  /** Premium-only branded slug (see ResumeService.create's generateBrandedSlug call) — omitted for every other tier, which keeps today's {title}-{random6} behavior untouched. */
  slug?: string;
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
  languages?: LanguageEntry[];
  referencesEnabled?: boolean;
  references?: ReferenceEntry[];
  referencesRecruiterModeOnly?: boolean;
  generatedSummary?: string;
  generatedBullets?: string[];
  /** See ResumeRecord.summaryManuallyEdited / ResumeService.update's regeneration gate. Send `false` explicitly for the "Reset to auto-generated" action. */
  summaryManuallyEdited?: boolean;
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
    summaryManuallyEdited: !!row.summaryManuallyEdited,
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

  /** Total resume count, and how many were created in the last N days — powers the admin dashboard's "Resumes" tile. */
  async countAll(): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM resumes`).first<{ count: number }>();
    return row?.count ?? 0;
  }

  async countCreatedSince(isoDate: string): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) as count FROM resumes WHERE createdAt >= ?`)
      .bind(isoDate)
      .first<{ count: number }>();
    return row?.count ?? 0;
  }

  /**
   * One row per (profession, templateKey) pair with how many resumes use
   * that combination — feeds the template picker's "most popular with
   * <profession>" indicator (see popularTemplates.ts's computePopularTemplates,
   * which turns this into one best template per profession). Excludes
   * "classic" entirely: it's the Starter-tier default every new resume
   * starts on (STARTER_DEFAULT_TEMPLATE_KEY in SubscriptionService.ts), so
   * counting it would mostly measure who never opened the template picker,
   * not genuine preference.
   */
  async countByProfessionAndTemplate(): Promise<{ profession: string; templateKey: string; count: number }[]> {
    const { results } = await this.db
      .prepare(
        `SELECT profession, templateKey, COUNT(*) as count
         FROM resumes
         WHERE templateKey != 'classic'
         GROUP BY profession, templateKey`
      )
      .all<{ profession: string; templateKey: string; count: number }>();
    return results;
  }

  /**
   * Search across every user's resumes by title, slug, or owner email/name
   * — the admin's global resume search (see AdminResumeController), since
   * the only prior way to find a resume was opening the right user first.
   * Joins users for the owner's name/email since resumes only stores
   * userId. Paginated the same way as the admin Users list.
   */
  async searchAllWithOwner(params: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<{ resumes: (ResumeRecord & { ownerName: string; ownerEmail: string })[]; total: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    const offset = (page - 1) * pageSize;
    const q = params.q?.trim();
    const where = q ? `WHERE r.title LIKE ? OR r.slug LIKE ? OR u.email LIKE ? OR u.name LIKE ?` : "";
    const likeArgs = q ? [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`] : [];

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as count FROM resumes r JOIN users u ON u.id = r."userId" ${where}`)
      .bind(...likeArgs)
      .first<{ count: number }>();

    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.name as ownerName, u.email as ownerEmail
         FROM resumes r
         JOIN users u ON u.id = r."userId"
         ${where}
         ORDER BY r."updatedAt" DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...likeArgs, pageSize, offset)
      .all<ResumeRecord & { ownerName: string; ownerEmail: string }>();

    return {
      resumes: results.map((row) => ({ ...normalizeBooleans(row), ownerName: row.ownerName, ownerEmail: row.ownerEmail })),
      total: countRow?.count ?? 0,
    };
  }

  /**
   * Every resume matching the same search used by searchAllWithOwner,
   * unpaginated (up to `limit`) — backs the Resumes CSV export. Capped at
   * 5,000 rows for the same reason as UserRepository's equivalent.
   */
  async searchAllWithOwnerUnpaged(params: { q?: string; limit?: number }): Promise<(ResumeRecord & { ownerName: string; ownerEmail: string })[]> {
    const q = params.q?.trim();
    const where = q ? `WHERE r.title LIKE ? OR r.slug LIKE ? OR u.email LIKE ? OR u.name LIKE ?` : "";
    const likeArgs = q ? [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`] : [];
    const limit = Math.min(5000, Math.max(1, params.limit ?? 5000));

    const { results } = await this.db
      .prepare(
        `SELECT r.*, u.name as ownerName, u.email as ownerEmail
         FROM resumes r
         JOIN users u ON u.id = r."userId"
         ${where}
         ORDER BY r."updatedAt" DESC
         LIMIT ?`
      )
      .bind(...likeArgs, limit)
      .all<ResumeRecord & { ownerName: string; ownerEmail: string }>();

    return results.map((row) => ({ ...normalizeBooleans(row), ownerName: row.ownerName, ownerEmail: row.ownerEmail }));
  }

  /** Bulk version of delete() — same child-table cascade, batched per resume id so partial failures can't leave orphaned child rows. Used by the admin Resumes page's multi-select delete. */
  async deleteBulk(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const statements = ids.flatMap((id) => [
      this.db.prepare(`DELETE FROM resume_versions WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resume_views WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resume_score_snapshots WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resume_keyword_checks WHERE "resumeId" = ?`).bind(id),
      // Unlike the DELETEs above, job_applications rows survive — see
      // migrations/0015_job_applications.sql — since losing an application's
      // notes/status history just because the resume it was sent with got
      // deleted would be a bad surprise. Only the now-dangling link is cleared.
      this.db.prepare(`UPDATE job_applications SET "resumeId" = NULL WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resumes WHERE id = ?`).bind(id),
    ]);
    await this.db.batch(statements);
  }

  async create(input: CreateResumeInput): Promise<ResumeRecord> {
    const now = new Date().toISOString();
    const record: ResumeRecord = {
      id: nanoid(12),
      userId: input.userId,
      slug: input.slug ?? `${slugify(input.title)}-${nanoid(6)}`,
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
      languages: JSON.stringify(input.languages ?? []),
      // References, like Recruiter Mode, is only ever turned on from Edit
      // Resume, never at creation time.
      referencesEnabled: false,
      references: JSON.stringify([]),
      referencesRecruiterModeOnly: false,
      generatedSummary: input.generatedSummary,
      generatedBullets: JSON.stringify(input.generatedBullets),
      summaryManuallyEdited: false,
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
      languages: input.languages ? JSON.stringify(input.languages) : existing.languages,
      referencesEnabled: input.referencesEnabled !== undefined ? input.referencesEnabled : existing.referencesEnabled,
      references: input.references ? JSON.stringify(input.references) : existing.references,
      referencesRecruiterModeOnly:
        input.referencesRecruiterModeOnly !== undefined ? input.referencesRecruiterModeOnly : existing.referencesRecruiterModeOnly,
      generatedSummary: input.generatedSummary ?? existing.generatedSummary,
      generatedBullets: input.generatedBullets ? JSON.stringify(input.generatedBullets) : existing.generatedBullets,
      summaryManuallyEdited: input.summaryManuallyEdited !== undefined ? input.summaryManuallyEdited : existing.summaryManuallyEdited,
      updatedAt: bumpUpdatedAt ? new Date().toISOString() : existing.updatedAt,
    };
    await this.updateRow(id, merged as unknown as Record<string, unknown>);
    return merged;
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.db.prepare(`UPDATE resumes SET viewCount = viewCount + 1 WHERE id = ?`).bind(id).run();
  }

  /**
   * Deletes a resume along with every row in the child tables that
   * reference it via `resumeId` (resume_versions, resume_views,
   * resume_score_snapshots, resume_keyword_checks — see migrations 0007/
   * 0008). D1 now enforces FOREIGN KEY constraints, so deleting the parent
   * row first (the old, inherited BaseRepository.delete behavior) fails
   * with SQLITE_CONSTRAINT_FOREIGNKEY whenever any of those child rows
   * exist — which by the time someone clicks "Delete" is virtually always
   * true (every resume gets at least one score snapshot on create). Run as
   * a single D1 batch so this is atomic — either every row for this resume
   * disappears, or none do.
   */
  async delete(id: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(`DELETE FROM resume_versions WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resume_views WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resume_score_snapshots WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resume_keyword_checks WHERE "resumeId" = ?`).bind(id),
      // See deleteBulk's comment — job_applications rows survive a resume
      // delete (only the now-dangling resumeId link is cleared), unlike
      // every other child table above.
      this.db.prepare(`UPDATE job_applications SET "resumeId" = NULL WHERE "resumeId" = ?`).bind(id),
      this.db.prepare(`DELETE FROM resumes WHERE id = ?`).bind(id),
    ]);
  }

  /** Admin action — deletes every resume owned by a user, e.g. right before deleting the account itself. Same child-table cascade as delete() above, just scoped to every resume this user owns instead of one. */
  async deleteAllForUser(userId: string): Promise<void> {
    const resumeIdSubquery = `SELECT id FROM resumes WHERE userId = ?`;
    await this.db.batch([
      this.db.prepare(`DELETE FROM resume_versions WHERE "resumeId" IN (${resumeIdSubquery})`).bind(userId),
      this.db.prepare(`DELETE FROM resume_views WHERE "resumeId" IN (${resumeIdSubquery})`).bind(userId),
      this.db.prepare(`DELETE FROM resume_score_snapshots WHERE "resumeId" IN (${resumeIdSubquery})`).bind(userId),
      this.db.prepare(`DELETE FROM resume_keyword_checks WHERE "resumeId" IN (${resumeIdSubquery})`).bind(userId),
      this.db.prepare(`UPDATE job_applications SET "resumeId" = NULL WHERE "resumeId" IN (${resumeIdSubquery})`).bind(userId),
      this.db.prepare(`DELETE FROM resumes WHERE userId = ?`).bind(userId),
    ]);
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
  async clone(source: ResumeRecord, overrides: { title: string; templateKey: string; slug?: string }): Promise<ResumeRecord> {
    const now = new Date().toISOString();
    const record: ResumeRecord = {
      ...source,
      id: nanoid(12),
      slug: overrides.slug ?? `${slugify(overrides.title)}-${nanoid(6)}`,
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

/**
 * Premium-only "branded" slug — {subscriber name}-{resume title}, e.g.
 * "jordan-lee-software-engineer", instead of the {title}-{random6} every
 * other tier gets. Declared here (not as a method) so it can be reused by
 * ResumeService for both create() and clone() without duplicating the
 * collision-avoidance loop. Falls back to appending -2, -3, ... only if the
 * clean slug is already taken (e.g. the same person creates two resumes
 * with the same title) — most of the time this never triggers.
 */
export async function generateBrandedSlug(
  resumes: Pick<ResumeRepository, "findBySlug">,
  subscriberName: string,
  title: string
): Promise<string> {
  const base = `${slugify(subscriberName)}-${slugify(title)}`;
  let candidate = base;
  let suffix = 2;
  while (await resumes.findBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}
