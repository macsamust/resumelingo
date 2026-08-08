import { AchievementEntry, AwardEntry, EducationEntry, LinkVisibility, ResumeRecord, WorkExperienceEntry } from "../types";
import { getTemplateByKey } from "../config/templates";
import { getProfessionByKey } from "../config/professions";

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

  /** userId is the *requesting* user, if any (undefined for anonymous visitors). */
  isAccessibleBy(userId?: string, password?: string): boolean {
    if (userId && userId === this.userId) return true; // owner can always view their own resume, any visibility
    if (this.visibility === LinkVisibility.Public) return true;
    if (this.visibility === LinkVisibility.PasswordProtected) {
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
