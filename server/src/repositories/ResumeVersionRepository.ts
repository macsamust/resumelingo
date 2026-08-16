import { nanoid } from "nanoid";
import { pool } from "../db/database";
import { Resume } from "../models/Resume";
import { AchievementEntry, AwardEntry, EducationEntry, ReferenceEntry, SkillOrTool, WorkExperienceEntry } from "../types";

/**
 * What a version actually captures — the resume's *content*, not how its
 * public link is currently configured. Deliberately excludes
 * visibility/accessPassword/accessPasswordExpiresAt/active: restoring an old
 * version should bring back old wording, not silently reopen (or close) a
 * link the owner has since reconfigured on purpose.
 */
export interface ResumeVersionSnapshot {
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  photoUrl: string;
  title: string;
  profession: string;
  templateKey: string;
  coverLetterEnabled: boolean;
  generatedCoverLetter: string;
  recruiterLocation: string;
  recruiterAvailability: string;
  recruiterClearance: string;
  recruiterWorkAuthorization: string;
  recruiterExpectedSalary: string;
  recruiterRemotePreference: string;
  combineExperienceFormat: boolean;
  answers: Record<string, string>;
  experience: WorkExperienceEntry[];
  education: EducationEntry[];
  awards: AwardEntry[];
  achievements: AchievementEntry[];
  skillsAndTools: SkillOrTool[];
  referencesEnabled: boolean;
  references: ReferenceEntry[];
  referencesRecruiterModeOnly: boolean;
  generatedSummary: string;
  generatedBullets: string[];
}

export interface ResumeVersionRecord {
  id: string;
  resumeId: string;
  snapshot: ResumeVersionSnapshot;
  createdAt: string;
}

/** How many past versions to keep per resume — see snapshot()'s prune step. Chosen as a reasonable "undo the last several edits" window without letting the table grow unbounded on a resume that's edited constantly. */
const MAX_VERSIONS_PER_RESUME = 20;

function toSnapshot(resume: Resume): ResumeVersionSnapshot {
  return {
    fullName: resume.fullName,
    contactEmail: resume.contactEmail,
    contactPhone: resume.contactPhone,
    contactLinkedIn: resume.contactLinkedIn,
    photoUrl: resume.photoUrl,
    title: resume.title,
    profession: resume.profession,
    templateKey: resume.templateKey,
    coverLetterEnabled: resume.coverLetterEnabled,
    generatedCoverLetter: resume.generatedCoverLetter,
    recruiterLocation: resume.recruiterLocation,
    recruiterAvailability: resume.recruiterAvailability,
    recruiterClearance: resume.recruiterClearance,
    recruiterWorkAuthorization: resume.recruiterWorkAuthorization,
    recruiterExpectedSalary: resume.recruiterExpectedSalary,
    recruiterRemotePreference: resume.recruiterRemotePreference,
    combineExperienceFormat: resume.combineExperienceFormat,
    answers: resume.answers,
    experience: resume.experience,
    education: resume.education,
    awards: resume.awards,
    achievements: resume.achievements,
    skillsAndTools: resume.skillsAndTools,
    referencesEnabled: resume.referencesEnabled,
    references: resume.references,
    referencesRecruiterModeOnly: resume.referencesRecruiterModeOnly,
    generatedSummary: resume.generatedSummary,
    generatedBullets: resume.generatedBullets,
  };
}

/**
 * Postgres-backed store for resume_versions (see db/database.ts). Same
 * "pure event-log table, no BaseRepository" reasoning as
 * ResumeAnalyticsRepository — this isn't a single-record CRUD table, it's a
 * content-snapshot log keyed by resumeId. See worker/'s D1 port of this
 * same class for the Cloudflare-side equivalent.
 */
export class ResumeVersionRepository {
  private readonly pool = pool;

  /**
   * Snapshots `resume`'s current content into a new version row, then prunes
   * anything past the MAX_VERSIONS_PER_RESUME most recent rows for that
   * resume — called with the *pre-update* Resume in ResumeService.update,
   * so each version represents "how this resume looked right before this
   * save," and with the *pre-restore* Resume in restoreVersion, so undoing a
   * restore is itself possible.
   */
  async snapshot(resume: Resume): Promise<void> {
    await this.pool.query(`INSERT INTO resume_versions ("id", "resumeId", "snapshot", "createdAt") VALUES ($1, $2, $3, $4)`, [
      nanoid(12),
      resume.id,
      JSON.stringify(toSnapshot(resume)),
      new Date().toISOString(),
    ]);

    await this.pool.query(
      `DELETE FROM resume_versions
       WHERE "resumeId" = $1 AND "id" NOT IN (
         SELECT "id" FROM resume_versions WHERE "resumeId" = $1 ORDER BY "createdAt" DESC LIMIT $2
       )`,
      [resume.id, MAX_VERSIONS_PER_RESUME]
    );
  }

  /** Newest first — see ResumeController.listVersions. */
  async listForResume(resumeId: string): Promise<ResumeVersionRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT "id", "resumeId", "snapshot", "createdAt" FROM resume_versions WHERE "resumeId" = $1 ORDER BY "createdAt" DESC`,
      [resumeId]
    );
    return (rows as { id: string; resumeId: string; snapshot: string; createdAt: string }[]).map((r) => ({
      ...r,
      snapshot: JSON.parse(r.snapshot) as ResumeVersionSnapshot,
    }));
  }

  /** Scoped to resumeId too (not just the version's own id) so one user can never restore/view a version row belonging to someone else's resume by guessing a version id. */
  async findById(resumeId: string, versionId: string): Promise<ResumeVersionRecord | undefined> {
    const { rows } = await this.pool.query(
      `SELECT "id", "resumeId", "snapshot", "createdAt" FROM resume_versions WHERE "id" = $1 AND "resumeId" = $2`,
      [versionId, resumeId]
    );
    const row = rows[0] as { id: string; resumeId: string; snapshot: string; createdAt: string } | undefined;
    return row ? { ...row, snapshot: JSON.parse(row.snapshot) as ResumeVersionSnapshot } : undefined;
  }
}
