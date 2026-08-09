import { AchievementEntry, AwardEntry, EducationEntry, LinkVisibility, ResumeRecord, WorkExperienceEntry } from "../types";
import { getTemplateByKey } from "../config/templates";
import { getProfessionByKey } from "../config/professions";
import { extractKeywords } from "../utils/keywords";

/**
 * Domain model for a resume. Handles JSON (de)serialization of the
 * answers/bullets columns and the public-vs-private access check, so
 * controllers never touch raw SQLite rows directly.
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
  readonly coverLetterEnabled: boolean;
  readonly generatedCoverLetter: string;
  readonly recruiterModeEnabled: boolean;
  readonly recruiterLocation: string;
  readonly recruiterAvailability: string;
  readonly recruiterClearance: string;
  readonly recruiterWorkAuthorization: string;
  readonly recruiterExpectedSalary: string;
  readonly recruiterRemotePreference: string;
  readonly answers: Record<string, string>;
  readonly experience: WorkExperienceEntry[];
  readonly education: EducationEntry[];
  readonly awards: AwardEntry[];
  readonly achievements: AchievementEntry[];
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
    this.coverLetterEnabled = record.coverLetterEnabled;
    this.generatedCoverLetter = record.generatedCoverLetter;
    this.recruiterModeEnabled = record.recruiterModeEnabled;
    this.recruiterLocation = record.recruiterLocation;
    this.recruiterAvailability = record.recruiterAvailability;
    this.recruiterClearance = record.recruiterClearance;
    this.recruiterWorkAuthorization = record.recruiterWorkAuthorization;
    this.recruiterExpectedSalary = record.recruiterExpectedSalary;
    this.recruiterRemotePreference = record.recruiterRemotePreference;
    this.answers = JSON.parse(record.answers || "{}");
    this.experience = JSON.parse(record.experience || "[]");
    this.education = JSON.parse(record.education || "[]");
    this.awards = JSON.parse(record.awards || "[]");
    this.achievements = JSON.parse(record.achievements || "[]");
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
   * expiration concept. Checked separately from isAccessibleBy (rather than
   * folded into it) so ResumeService.getPublicBySlug can report a distinct
   * "expired" reason instead of the generic "wrong password" one.
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
   * check truthiness instead of re-checking recruiterModeEnabled. "skills"
   * isn't a stored field; it's derived from the resume's own generated
   * bullets and answers (see utils/keywords.ts) so it can't drift out of
   * sync with the actual resume content.
   */
  get recruiterCard() {
    if (!this.recruiterModeEnabled) return null;
    const skillsText = [...this.generatedBullets, ...Object.values(this.answers)].join(" ");
    return {
      location: this.recruiterLocation,
      availability: this.recruiterAvailability,
      clearance: this.recruiterClearance,
      workAuthorization: this.recruiterWorkAuthorization,
      expectedSalary: this.recruiterExpectedSalary,
      remotePreference: this.recruiterRemotePreference,
      skills: extractKeywords(skillsText, 8),
    };
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
      coverLetterEnabled: this.coverLetterEnabled,
      generatedCoverLetter: this.generatedCoverLetter,
      recruiterModeEnabled: this.recruiterModeEnabled,
      recruiterLocation: this.recruiterLocation,
      recruiterAvailability: this.recruiterAvailability,
      recruiterClearance: this.recruiterClearance,
      recruiterWorkAuthorization: this.recruiterWorkAuthorization,
      recruiterExpectedSalary: this.recruiterExpectedSalary,
      recruiterRemotePreference: this.recruiterRemotePreference,
      answers: this.answers,
      experience: this.experience,
      education: this.education,
      awards: this.awards,
      achievements: this.achievements,
      generatedSummary: this.generatedSummary,
      generatedBullets: this.generatedBullets,
      viewCount: this.viewCount,
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
      answers: this.answers,
      experience: this.experience,
      education: this.education,
      awards: this.awards,
      generatedSummary: this.generatedSummary,
      generatedBullets: this.generatedBullets,
      slug: this.slug,
    };
  }
}
