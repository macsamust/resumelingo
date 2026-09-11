import { AchievementEntry, AwardEntry, EducationEntry, LanguageEntry, LinkVisibility, ReferenceEntry, ResumeRecord, SkillOrTool, WorkExperienceEntry } from "../types";
import { getTemplateByKey } from "../config/templates";
import { getProfessionByKey } from "../config/professions";
import { extractKeywords } from "../utils/keywords";
import { buildCandidateSummary } from "../utils/candidateSummary";
import { sha256Hex } from "../utils/crypto";

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
  /**
   * Legacy plaintext password — no longer written to on save (see
   * ResumeService.update, which now hashes into accessPasswordHash instead
   * and clears this column). Kept readable only so isPasswordCorrect below
   * can still validate a resume that was password-protected before this
   * hashing change shipped and hasn't been saved since. Once every
   * pre-existing password-protected resume has been saved at least once
   * (which happens automatically the next time its owner touches Edit
   * Resume), this column will be null everywhere and could be dropped.
   */
  readonly accessPassword: string | null;
  /** sha256Hex of the resume's own access password — see isPasswordCorrect. Null for a resume that predates this hashing change and hasn't been re-saved yet (falls back to the legacy accessPassword column above). */
  readonly accessPasswordHash: string | null;
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
  /**
   * Hashed (sha256Hex), never plaintext — same treatment accessPasswordHash
   * above now gets too (that used to be a plaintext-only field; fixed in a
   * Sep 2026 security pass). See isRecruiterCodeValid below and
   * ResumeService's hashing on save.
   */
  readonly recruiterAccessCodeHash: string | null;
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
  readonly summaryManuallyEdited: boolean;
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
    this.accessPasswordHash = record.accessPasswordHash;
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
    this.recruiterAccessCodeHash = record.recruiterAccessCodeHash;
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
    this.summaryManuallyEdited = !!record.summaryManuallyEdited;
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

  get hasRecruiterAccessCode(): boolean {
    return !!this.recruiterAccessCodeHash;
  }

  /**
   * True if `code` hashes to the stored recruiterAccessCodeHash. Always
   * false (not an error) when no code has ever been set — see
   * ResumeService's save-time validation, which requires a code to be set
   * before Recruiter Mode can be turned on, so this should only be reached
   * for legacy resumes that had Recruiter Mode enabled before this feature
   * existed and haven't been saved since (fails closed: the card simply
   * can't be unlocked until the owner sets a code on their next save,
   * rather than falling back to showing it unprotected).
   */
  async isRecruiterCodeValid(code: string): Promise<boolean> {
    // Trimmed here (not just by callers) so this is correct regardless of
    // whether a caller remembers to trim first — ResumeService.update trims
    // the same way before hashing on save, so a code with incidental
    // leading/trailing whitespace still matches.
    const trimmed = code?.trim();
    if (!this.recruiterAccessCodeHash || !trimmed) return false;
    return (await sha256Hex(trimmed)) === this.recruiterAccessCodeHash;
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

  /**
   * True if `password` matches this resume's stored password. Hash-compares
   * against accessPasswordHash when present (every resume saved since this
   * hashing change shipped); falls back to a plain `===` against the legacy
   * accessPassword column only for a resume that was password-protected
   * before then and hasn't been saved since (see accessPasswordHash's doc
   * comment) — that fallback goes away on its own as those resumes get
   * re-saved.
   */
  async isPasswordCorrect(password?: string): Promise<boolean> {
    if (!password) return false;
    if (this.accessPasswordHash) {
      return (await sha256Hex(password)) === this.accessPasswordHash;
    }
    if (this.accessPassword) {
      return password === this.accessPassword;
    }
    return false;
  }

  /** userId is the *requesting* user, if any (undefined for anonymous visitors). */
  async isAccessibleBy(userId?: string, password?: string): Promise<boolean> {
    if (userId && userId === this.userId) return true; // owner can always view their own resume, any visibility
    if (this.visibility === LinkVisibility.Public) return true;
    if (this.visibility === LinkVisibility.PasswordProtected) {
      if (this.isPasswordExpired) return false;
      return this.isPasswordCorrect(password);
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
      // Checks both columns — a resume saved since the hashing change has
      // accessPasswordHash set and accessPassword null; one that predates it
      // and hasn't been re-saved yet still has the legacy plaintext column
      // populated instead. Either way this stays a true/false indicator,
      // never the actual secret (see accessPasswordHash's doc comment).
      hasPassword: !!this.accessPassword || !!this.accessPasswordHash,
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
      hasRecruiterAccessCode: this.hasRecruiterAccessCode,
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
      summaryManuallyEdited: this.summaryManuallyEdited,
      viewCount: this.viewCount,
      strengthScore: this.strengthScore,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * `includeRecruiterCard` defaults to false — the main public resume load
   * (PublicController.getBySlug) always calls this with no argument, so the
   * recruiter card is hidden by default the moment Recruiter Mode is on,
   * regardless of the resume's own visibility setting. It's only ever true
   * when ResumeService's separate unlockRecruiterCard flow has already
   * verified the viewer's submitted code against
   * isRecruiterCodeValid — see PublicController's recruiter-card route.
   * `recruiterCardLocked` tells the client the difference between "off" and
   * "on but not yet unlocked," since recruiterCard is null in both cases.
   */
  toPublicJSON(options: { includeRecruiterCard?: boolean } = {}) {
    const showRecruiterCard = this.recruiterModeEnabled && options.includeRecruiterCard === true;
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
      recruiterCard: showRecruiterCard ? this.recruiterCard : null,
      recruiterCardLocked: this.recruiterModeEnabled && !showRecruiterCard,
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
