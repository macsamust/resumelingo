import { AchievementEntry, AwardEntry, EducationEntry, LanguageEntry, LinkVisibility, ReferenceEntry, ResumeRecord, SkillOrTool, WorkExperienceEntry } from "../types";
import { getTemplateByKey } from "../config/templates";
import { getProfessionByKey } from "../config/professions";
import { extractKeywords } from "../utils/keywords";
import { buildCandidateSummary } from "../utils/candidateSummary";

/**
 * Domain model for a resume. Handles JSON (de)serialization of the
 * answers/bullets/experience/etc. columns and the public-vs-private access
 * check, so controllers never touch raw D1 rows directly. Identical to the
 * Node/Express version — no I/O here — except that boolean fields are
 * coerced with `!!` since D1 may hand back 0/1 instead of true/false for an
 * INTEGER column (see ResumeRepository's normalizeBooleans, which already
 * does this on read, but coercing again here is a cheap defensive belt-and-
 * suspenders given how many callers construct a Resume directly from a
 * ResumeRecord).
 */
export class Resume {
  readonly id: string;
  readonly userId: string;
  readonly slug: string;
  readonly fullName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly contactLinkedIn: string;
  readonly photoUrl: string;
  readonly title: string;
  readonly profession: string;
  readonly templateKey: string;
  readonly visibility: LinkVisibility;
  readonly accessPassword: string | null;
  readonly accessPasswordExpiresAt: string | null;
  readonly active: boolean;
  readonly coverLetterEnabled: boolean;
  readonly generatedCoverLetter: string;
  readonly recruiterModeEnabled: boolean;
  readonly recruiterLocation: string;
  readonly recruiterAvailability: string;
  readonly recruiterClearance: string;
  readonly recruiterWorkAuthorization: string;
  readonly recruiterExpectedSalary: string;
  readonly recruiterRemotePreference: string;
  readonly combineExperienceFormat: boolean;
  readonly answers: Record<string, string>;
  readonly experience: WorkExperienceEntry[];
  readonly education: EducationEntry[];
  readonly awards: AwardEntry[];
  readonly achievements: AchievementEntry[];
  readonly skillsAndTools: SkillOrTool[];
  readonly languages: LanguageEntry[];
  readonly referencesEnabled: boolean;
  readonly references: ReferenceEntry[];
  readonly referencesRecruiterModeOnly: boolean;
  readonly generatedSummary: string;
  readonly generatedBullets: string[];
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(record: ResumeRecord) {
    this.id = record.id;
    this.userId = record.userId;
    this.slug = record.slug;
    this.fullName = record.fullName;
    this.contactEmail = record.contactEmail;
    this.contactPhone = record.contactPhone;
    this.contactLinkedIn = record.contactLinkedIn;
    this.photoUrl = record.photoUrl;
    this.title = record.title;
    this.profession = record.profession;
    this.templateKey = record.templateKey;
    this.visibility = record.visibility;
    this.accessPassword = record.accessPassword;
    this.accessPasswordExpiresAt = record.accessPasswordExpiresAt;
    this.active = !!record.active;
    this.coverLetterEnabled = !!record.coverLetterEnabled;
    this.generatedCoverLetter = record.generatedCoverLetter;
    this.recruiterModeEnabled = !!record.recruiterModeEnabled;
    this.recruiterLocation = record.recruiterLocation;
    this.recruiterAvailability = record.recruiterAvailability;
    this.recruiterClearance = record.recruiterClearance;
    this.recruiterWorkAuthorization = record.recruiterWorkAuthorization;
    this.recruiterExpectedSalary = record.recruiterExpectedSalary;
    this.recruiterRemotePreference = record.recruiterRemotePreference;
    this.combineExperienceFormat = !!record.combineExperienceFormat;
    this.answers = JSON.parse(record.answers || "{}");
    this.experience = JSON.parse(record.experience || "[]");
    this.education = JSON.parse(record.education || "[]");
    this.awards = JSON.parse(record.awards || "[]");
    this.achievements = JSON.parse(record.achievements || "[]");
    this.skillsAndTools = JSON.parse(record.skillsAndTools || "[]");
    this.languages = JSON.parse(record.languages || "[]");
    this.referencesEnabled = !!record.referencesEnabled;
    this.references = JSON.parse(record.references || "[]");
    this.referencesRecruiterModeOnly = !!record.referencesRecruiterModeOnly;
    this.generatedSummary = record.generatedSummary;
    this.generatedBullets = JSON.parse(record.generatedBullets || "[]");
    this.viewCount = record.viewCount;
    this.createdAt = record.createdAt;
    this.updatedAt = record.updatedAt;
  }

  get professionLabel(): string {
    return getProfessionByKey(this.profession)?.label ?? this.profession;
  }

  get template() {
    return getTemplateByKey(this.templateKey);
  }

  /**
   * True once a password-protected link's expiration has passed. Only ever
   * true for LinkVisibility.PasswordProtected — other visibilities have no
   * expiration concept. Checked separately from isAccessibleBy so
   * ResumeService.getPublicBySlug can report a distinct "expired" reason
   * instead of the generic "wrong password" one.
   */
  get isPasswordExpired(): boolean {
    return (
      this.visibility === LinkVisibility.PasswordProtected &&
      !!this.accessPasswordExpiresAt &&
      new Date(this.accessPasswordExpiresAt).getTime() < Date.now()
    );
  }

  /**
   * The candidate summary card shown at the top of the public resume link
   * when Recruiter Mode is on — null when it's off, so callers can just
   * check truthiness instead of re-checking recruiterModeEnabled.
   * "skills" prefers the user's own picks from the "Skills & Tools" section
   * when there are any, since those are deliberate, curated choices rather
   * than a guess. Falls back to the old extracted-keyword behavior for a
   * resume that hasn't used that section.
   */
  get recruiterCard() {
    if (!this.recruiterModeEnabled) return null;
    const pickedSkills = this.skillsAndTools.filter((s) => s.category === "skill").map((s) => s.label);
    const skillsText = [...this.generatedBullets, ...Object.values(this.answers)].join(" ");
    const skills = pickedSkills.length > 0 ? pickedSkills : extractKeywords(skillsText, 8);
    return {
      location: this.recruiterLocation,
      availability: this.recruiterAvailability,
      clearance: this.recruiterClearance,
      workAuthorization: this.recruiterWorkAuthorization,
      expectedSalary: this.recruiterExpectedSalary,
      remotePreference: this.recruiterRemotePreference,
      skills,
      candidateSummary: buildCandidateSummary({
        professionLabel: this.professionLabel,
        title: this.title,
        experience: this.experience,
        achievements: this.achievements,
        generatedBullets: this.generatedBullets,
        skills,
      }),
      // Only populated when the owner has both "Add references" and "only
      // in Recruiter Mode printout" checked — see publicReferences below
      // for the other half of this split.
      references: this.referencesEnabled && this.referencesRecruiterModeOnly ? this.references : [],
    };
  }

  /**
   * References list shown as the resume's own standalone section — empty
   * whenever referencesEnabled is off, and also empty when
   * referencesRecruiterModeOnly is on (in that case the same data is
   * exposed via recruiterCard.references instead).
   */
  get publicReferences(): ReferenceEntry[] {
    if (!this.referencesEnabled || this.referencesRecruiterModeOnly) return [];
    return this.references;
  }

  /**
   * Per-resume Profile Strength Score (0-100) — same formula
   * DashboardController averages across a user's resumes for the dashboard
   * tile, exposed per-resume too so it lives in one place instead of being
   * duplicated between the model and the controller.
   */
  get strengthScore(): number {
    let score = 40;
    const answerCount = Object.values(this.answers).filter((v) => v && v.trim()).length;
    score += Math.min(answerCount * 6, 40);
    if (this.generatedBullets.length >= 3) score += 10;
    if (this.generatedSummary.length > 80) score += 10;
    return Math.min(score, 100);
  }

  /** userId is the *requesting* user, if any (undefined for anonymous visitors). */
  isAccessibleBy(userId?: string, password?: string): boolean {
    if (userId && userId === this.userId) return true; // owner can always view their own resume, any visibility
    if (this.visibility === LinkVisibility.Public) return true;
    if (this.visibility === LinkVisibility.PasswordProtected) {
      if (this.isPasswordExpired) return false;
      return !!password && password === this.accessPassword;
    }
    return false; // private — owner-only, and the owner case is already handled above
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      slug: this.slug,
      fullName: this.fullName,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      contactLinkedIn: this.contactLinkedIn,
      photoUrl: this.photoUrl,
      title: this.title,
      profession: this.profession,
      professionLabel: this.professionLabel,
      templateKey: this.templateKey,
      template: this.template,
      visibility: this.visibility,
      hasPassword: !!this.accessPassword,
      accessPasswordExpiresAt: this.accessPasswordExpiresAt,
      active: this.active,
      coverLetterEnabled: this.coverLetterEnabled,
      generatedCoverLetter: this.generatedCoverLetter,
      recruiterModeEnabled: this.recruiterModeEnabled,
      recruiterLocation: this.recruiterLocation,
      recruiterAvailability: this.recruiterAvailability,
      recruiterClearance: this.recruiterClearance,
      recruiterWorkAuthorization: this.recruiterWorkAuthorization,
      recruiterExpectedSalary: this.recruiterExpectedSalary,
      recruiterRemotePreference: this.recruiterRemotePreference,
      combineExperienceFormat: this.combineExperienceFormat,
      answers: this.answers,
      experience: this.experience,
      education: this.education,
      awards: this.awards,
      achievements: this.achievements,
      skillsAndTools: this.skillsAndTools,
      languages: this.languages,
      referencesEnabled: this.referencesEnabled,
      references: this.references,
      referencesRecruiterModeOnly: this.referencesRecruiterModeOnly,
      generatedSummary: this.generatedSummary,
      generatedBullets: this.generatedBullets,
      viewCount: this.viewCount,
      strengthScore: this.strengthScore,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toPublicJSON() {
    return {
      fullName: this.fullName,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      contactLinkedIn: this.contactLinkedIn,
      photoUrl: this.photoUrl,
      title: this.title,
      professionLabel: this.professionLabel,
      templateKey: this.templateKey,
      template: this.template,
      recruiterCard: this.recruiterCard,
      combineExperienceFormat: this.combineExperienceFormat,
      answers: this.answers,
      experience: this.experience,
      education: this.education,
      awards: this.awards,
      achievements: this.achievements,
      skillsAndTools: this.skillsAndTools,
      languages: this.languages,
      references: this.publicReferences,
      generatedSummary: this.generatedSummary,
      generatedBullets: this.generatedBullets,
      slug: this.slug,
    };
  }
}
