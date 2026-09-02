import { nanoid } from "nanoid";
import { Resume } from "../models/Resume";
import { AchievementEntry, AwardEntry, EducationEntry, LanguageEntry, ReferenceEntry, SkillOrTool, WorkExperienceEntry } from "../types";

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
  languages: LanguageEntry[];
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
  /** Short human-readable note on what changed going into this save — see worker/src/utils/versionChangeSummary.ts. "" for rows saved before this column existed (migrations/0028). */
  changeSummary: string;
}

/** How many past versions to keep per resume — see snapshot()'s prune step. Chosen as a reasonable "undo the last several edits" window without letting the table grow unbounded on a resume that's edited constantly. */
const MAX_VERSIONS_PER_RESUME = 10;

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
    languages: resume.languages,
    referencesEnabled: resume.referencesEnabled,
    references: resume.references,
    referencesRecruiterModeOnly: resume.referencesRecruiterModeOnly,
    generatedSummary: resume.generatedSummary,
    generatedBullets: resume.generatedBullets,
  };
}

/**
 * D1-backed store for resume_versions — see migrations/0008_resume_versions.sql.
 * Not a BaseRepository subclass, same reasoning as ResumeAnalyticsRepository:
 * this is a content-snapshot log keyed by resumeId, not a single-record CRUD
 * table with its own domain model.
 */
export class ResumeVersionRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Snapshots `resume`'s current content into a new version row, then prunes
   * anything past the MAX_VERSIONS_PER_RESUME most recent rows for that
   * resume — called with the *pre-update* Resume in ResumeService.update,
   * so each version represents "how this resume looked right before this
   * save," and with the *pre-restore* Resume in restoreVersion, so undoing a
   * restore is itself possible. `changeSummary` is a short human-readable
   * note on what the upcoming save is about to change (see
   * utils/versionChangeSummary.ts), stored alongside this pre-update
   * snapshot so Version History can show it next to the version it led into.
   */
  async snapshot(resume: Resume, changeSummary: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO resume_versions ("id", "resumeId", "snapshot", "createdAt", "changeSummary") VALUES (?, ?, ?, ?, ?)`)
      .bind(nanoid(12), resume.id, JSON.stringify(toSnapshot(resume)), new Date().toISOString(), changeSummary)
      .run();

    await this.db
      .prepare(
        `DELETE FROM resume_versions
         WHERE "resumeId" = ? AND "id" NOT IN (
           SELECT "id" FROM resume_versions WHERE "resumeId" = ? ORDER BY "createdAt" DESC LIMIT ?
         )`
      )
      .bind(resume.id, resume.id, MAX_VERSIONS_PER_RESUME)
      .run();
  }

  /** Newest first — see ResumeController.listVersions. */
  async listForResume(resumeId: string): Promise<ResumeVersionRecord[]> {
    const { results } = await this.db
      .prepare(
        `SELECT "id", "resumeId", "snapshot", "createdAt", "changeSummary" FROM resume_versions WHERE "resumeId" = ? ORDER BY "createdAt" DESC`
      )
      .bind(resumeId)
      .all<{ id: string; resumeId: string; snapshot: string; createdAt: string; changeSummary: string }>();
    return results.map((r) => ({ ...r, snapshot: JSON.parse(r.snapshot) as ResumeVersionSnapshot }));
  }

  /** Scoped to resumeId too (not just the version's own id) so one user can never restore/view a version row belonging to someone else's resume by guessing a version id. */
  async findById(resumeId: string, versionId: string): Promise<ResumeVersionRecord | undefined> {
    const row = await this.db
      .prepare(
        `SELECT "id", "resumeId", "snapshot", "createdAt", "changeSummary" FROM resume_versions WHERE "id" = ? AND "resumeId" = ?`
      )
      .bind(versionId, resumeId)
      .first<{ id: string; resumeId: string; snapshot: string; createdAt: string; changeSummary: string }>();
    return row ? { ...row, snapshot: JSON.parse(row.snapshot) as ResumeVersionSnapshot } : undefined;
  }
}
