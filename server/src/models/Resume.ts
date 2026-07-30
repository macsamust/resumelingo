import { LinkVisibility, ResumeRecord } from "../types";
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
  readonly title: string;
  readonly profession: string;
  readonly templateKey: string;
  readonly visibility: LinkVisibility;
  readonly accessPassword: string | null;
  readonly answers: Record<string, string>;
  readonly generatedSummary: string;
  readonly generatedBullets: string[];
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(record: ResumeRecord) {
    this.id = record.id;
    this.userId = record.userId;
    this.slug = record.slug;
    this.title = record.title;
    this.profession = record.profession;
    this.templateKey = record.templateKey;
    this.visibility = record.visibility;
    this.accessPassword = record.accessPassword;
    this.answers = JSON.parse(record.answers || "{}");
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

  isAccessibleWithout(password?: string): boolean {
    if (this.visibility === LinkVisibility.Public) return true;
    if (this.visibility === LinkVisibility.PasswordProtected) {
      return !!password && password === this.accessPassword;
    }
    return false; // private / recruiter-only requires ownership, checked by the controller
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      slug: this.slug,
      title: this.title,
      profession: this.profession,
      professionLabel: this.professionLabel,
      templateKey: this.templateKey,
      template: this.template,
      visibility: this.visibility,
      hasPassword: !!this.accessPassword,
      answers: this.answers,
      generatedSummary: this.generatedSummary,
      generatedBullets: this.generatedBullets,
      viewCount: this.viewCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toPublicJSON() {
    return {
      title: this.title,
      professionLabel: this.professionLabel,
      templateKey: this.templateKey,
      template: this.template,
      answers: this.answers,
      generatedSummary: this.generatedSummary,
      generatedBullets: this.generatedBullets,
      slug: this.slug,
    };
  }
}
