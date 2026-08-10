import { ResumeRepository, UpdateResumeInput } from "../repositories/ResumeRepository";
import { ResumeAnalyticsRepository } from "../repositories/ResumeAnalyticsRepository";
import { UserRepository } from "../repositories/UserRepository";
import { IContentGenerator, RuleBasedContentGenerator } from "./ContentGenerator";
import { ICoverLetterGenerator, pickTopExperience, RuleBasedCoverLetterGenerator } from "./CoverLetterGenerator";
import { Resume } from "../models/Resume";
import { User } from "../models/User";
import { AchievementEntry, AwardEntry, EducationEntry, LinkVisibility, SubscriptionTier, TemplateCategory, WorkExperienceEntry } from "../types";
import { CATEGORY_MIN_TIER, canUseTemplate, getTemplateByKey } from "../config/templates";
import { canUseVisibility, VISIBILITY_LABEL, VISIBILITY_MIN_TIER } from "../config/visibilityAccess";
import { getPlan } from "../config/subscriptionPlans";
import { getProfessionByKey } from "../config/professions";

/** Whether templateKey resolves to a Premium-category template — the gate for the "Generate AI cover letter" checkbox (see CreateResumeRequest/UpdateResumeInput's coverLetterEnabled). */
function isPremiumTemplate(templateKey: string): boolean {
  return getTemplateByKey(templateKey)?.category === TemplateCategory.Premium;
}

export class ResumeLimitError extends Error {}
export class ResumeNotFoundError extends Error {}
export class ResumeAccessError extends Error {
  constructor(message: string, public readonly reason: "password" | "private" | "forbidden" | "expired" = "forbidden") {
    super(message);
  }
}
export class TemplateAccessError extends Error {}
export class VisibilityAccessError extends Error {}
export class PhotoTooLargeError extends Error {}

// ~2MB of base64 text comfortably covers a photo resized/compressed
// client-side (see client/src/utils/image.ts) before upload; this is a
// server-side backstop in case that client-side step is ever bypassed.
const MAX_PHOTO_DATA_URL_LENGTH = 2_000_000;

function assertPhotoSizeOk(photoUrl: string | undefined): void {
  if (photoUrl && photoUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
    throw new PhotoTooLargeError("That photo is too large — please use a smaller image.");
  }
}

/**
 * Throws if `tier` isn't allowed to use `templateKey`'s category. A no-op
 * (never throws) for an unknown key — template *existence* isn't validated
 * here, only the tier gate for known templates, matching prior behavior.
 */
function assertTemplateAllowed(tier: User["subscriptionTier"], templateKey: string): void {
  const template = getTemplateByKey(templateKey);
  if (!template) return;
  if (canUseTemplate(tier, template.category)) return;
  const requiredPlan = getPlan(CATEGORY_MIN_TIER[template.category]);
  throw new TemplateAccessError(`The "${template.name}" template requires the ${requiredPlan.name} plan. Upgrade to use it.`);
}

/**
 * Throws if `tier` isn't allowed to use `visibility` — see
 * config/visibilityAccess.ts for the allow-list (Starter: public only;
 * Professional: public + private; Premium: all three, including password).
 */
function assertVisibilityAllowed(tier: User["subscriptionTier"], visibility: LinkVisibility): void {
  if (canUseVisibility(tier, visibility)) return;
  const requiredPlan = getPlan(VISIBILITY_MIN_TIER[visibility]);
  throw new VisibilityAccessError(
    `${VISIBILITY_LABEL[visibility]} links require the ${requiredPlan.name} plan. Upgrade to use this visibility setting.`
  );
}

export interface CreateResumeRequest {
  fullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  photoUrl?: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
  accessPasswordExpiresAt?: string | null;
  /** "Generate AI cover letter" checkbox — silently coerced to false server-side when templateKey isn't a Premium-tier template (see isPremiumTemplate). */
  coverLetterEnabled?: boolean;
  answers: Record<string, string>;
  experience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  achievements?: AchievementEntry[];
}

export class ResumeService {
  constructor(
    private readonly resumes: ResumeRepository = new ResumeRepository(),
    private readonly users: UserRepository = new UserRepository(),
    private readonly generator: IContentGenerator = new RuleBasedContentGenerator(),
    private readonly coverLetterGenerator: ICoverLetterGenerator = new RuleBasedCoverLetterGenerator(),
    private readonly analytics: ResumeAnalyticsRepository = new ResumeAnalyticsRepository()
  ) {}

  async listForUser(userId: string): Promise<Resume[]> {
    const records = await this.resumes.findAllForUser(userId);
    return records.map((r) => new Resume(r));
  }

  async getOwned(userId: string, resumeId: string): Promise<Resume> {
    const record = await this.resumes.findById(resumeId);
    if (!record) throw new ResumeNotFoundError("Resume not found.");
    if (record.userId !== userId) throw new ResumeAccessError("You do not have access to this resume.");
    return new Resume(record);
  }

  async create(user: User, input: CreateResumeRequest): Promise<Resume> {
    const currentCount = await this.users.countResumesForUser(user.id);
    if (!user.canCreateAdditionalResume(currentCount)) {
      throw new ResumeLimitError(
        `Your ${user.plan.name} plan is limited to ${user.plan.resumeLimit} resume(s). Upgrade to add more.`
      );
    }
    assertTemplateAllowed(user.subscriptionTier, input.templateKey);
    if (input.visibility) assertVisibilityAllowed(user.subscriptionTier, input.visibility);
    assertPhotoSizeOk(input.photoUrl);

    const fullName = input.fullName?.trim() || user.name;
    const generated = this.generator.generate(input.profession, input.answers, input.achievements ?? [], fullName, input.title);

    // Silently coerced rather than throwing: the checkbox itself is only
    // shown client-side for Premium-tier templates, but this keeps the
    // server the actual source of truth rather than trusting the client.
    const coverLetterEnabled = !!input.coverLetterEnabled && isPremiumTemplate(input.templateKey);
    const generatedCoverLetter = coverLetterEnabled
      ? this.coverLetterGenerator.generate({
          fullName,
          title: input.title,
          professionLabel: getProfessionByKey(input.profession)?.label ?? input.profession,
          summary: generated.summary,
          topExperience: pickTopExperience(input.experience ?? []),
        })
      : "";

    const record = await this.resumes.create({
      userId: user.id,
      // Defaults to the account holder's name, but is editable per resume —
      // e.g. someone building a resume for a different display name/nickname.
      fullName,
      // Defaults contact email to the account's email — phone and LinkedIn
      // have no natural default and are left blank until the user fills them in.
      contactEmail: input.contactEmail?.trim() || user.email,
      contactPhone: input.contactPhone?.trim() ?? "",
      contactLinkedIn: input.contactLinkedIn?.trim() ?? "",
      photoUrl: input.photoUrl ?? "",
      title: input.title,
      profession: input.profession,
      templateKey: input.templateKey,
      visibility: input.visibility ?? LinkVisibility.Public,
      accessPassword: input.accessPassword ?? null,
      accessPasswordExpiresAt: input.accessPasswordExpiresAt ?? null,
      coverLetterEnabled,
      generatedCoverLetter,
      answers: input.answers,
      experience: input.experience ?? [],
      education: input.education ?? [],
      awards: input.awards ?? [],
      achievements: input.achievements ?? [],
      generatedSummary: generated.summary,
      generatedBullets: generated.bullets,
    });
    const resume = new Resume(record);
    // First snapshot for the Resume Analytics score trend — see
    // ResumeAnalyticsRepository.scoreTrend. Fire-and-forget-safe (an
    // analytics write failing shouldn't fail resume creation), but awaited
    // here since there's no request-scoped background task runner in this
    // app to hand it off to.
    await this.analytics.recordScoreSnapshot(resume.id, resume.strengthScore);
    return resume;
  }

  async update(userId: string, resumeId: string, input: UpdateResumeInput): Promise<Resume> {
    const existing = await this.getOwned(userId, resumeId); // throws if not found/owned

    const templateChanging = !!input.templateKey && input.templateKey !== existing.templateKey;
    const visibilityChanging = !!input.visibility && input.visibility !== existing.visibility;
    // Recruiter Mode is Premium-only — re-checked (and silently coerced off,
    // not thrown, same as coverLetterEnabled below) on every update rather
    // than only when the toggle changes, so a downgraded subscriber's public
    // link stops showing the card on their very next save even if they never
    // touch the toggle again.
    const recruiterModeRequested = input.recruiterModeEnabled ?? existing.recruiterModeEnabled;
    let recruiterModeEnabled = recruiterModeRequested;
    // "References" is the same Premium-subscriber-tier gate as Recruiter
    // Mode above (not tied to which template is selected) — re-checked
    // alongside it so a downgraded subscriber's public link stops showing
    // the section on their very next save even if they never touch the
    // toggle again.
    const referencesRequested = input.referencesEnabled ?? existing.referencesEnabled;
    let referencesEnabled = referencesRequested;
    if (templateChanging || visibilityChanging || recruiterModeRequested || referencesRequested) {
      const userRecord = await this.users.findById(userId);
      if (userRecord) {
        const tier = new User(userRecord).subscriptionTier;
        if (templateChanging) assertTemplateAllowed(tier, input.templateKey!);
        if (visibilityChanging) assertVisibilityAllowed(tier, input.visibility!);
        recruiterModeEnabled = recruiterModeRequested && tier === SubscriptionTier.Premium;
        referencesEnabled = referencesRequested && tier === SubscriptionTier.Premium;
      } else {
        recruiterModeEnabled = false;
        referencesEnabled = false;
      }
    }
    assertPhotoSizeOk(input.photoUrl);

    // Regenerate content if the answers or achievements changed, so editing
    // stays "live." Either one can arrive alone (the edit page always sends
    // both together, but this stays correct even if a caller doesn't), so
    // whichever wasn't provided falls back to what's already saved.
    let generatedSummary = input.generatedSummary;
    let generatedBullets = input.generatedBullets;
    const professionChanged = !!input.profession && input.profession !== existing.profession;
    const nameChanged = !!input.fullName && input.fullName !== existing.fullName;
    const titleChanged = !!input.title && input.title !== existing.title;
    if (input.answers || input.achievements || professionChanged || nameChanged || titleChanged) {
      const profession = input.profession ?? existing.profession;
      const answers = input.answers ?? existing.answers;
      const achievements = input.achievements ?? existing.achievements;
      const fullName = input.fullName ?? existing.fullName;
      const title = input.title ?? existing.title;
      const generated = this.generator.generate(profession, answers, achievements, fullName, title);
      generatedSummary = generated.summary;
      generatedBullets = generated.bullets;
    }

    // Same "silently coerce, don't trust the client" gate as create(),
    // evaluated against whichever templateKey ends up in effect this update.
    const templateKeyFinal = input.templateKey ?? existing.templateKey;
    const coverLetterEnabledRequested = input.coverLetterEnabled ?? existing.coverLetterEnabled;
    const coverLetterEnabled = coverLetterEnabledRequested && isPremiumTemplate(templateKeyFinal);

    let generatedCoverLetter = existing.generatedCoverLetter;
    if (!coverLetterEnabled) {
      // Cleared rather than left stale, so re-enabling later (or a template
      // downgrade) never resurrects outdated content.
      generatedCoverLetter = "";
    } else {
      const templateChanged = !!input.templateKey && input.templateKey !== existing.templateKey;
      const coverLetterJustToggledOn = input.coverLetterEnabled !== undefined && !existing.coverLetterEnabled;
      const experienceChanged = input.experience !== undefined;
      const shouldRegenerate =
        !existing.generatedCoverLetter ||
        professionChanged ||
        nameChanged ||
        titleChanged ||
        templateChanged ||
        coverLetterJustToggledOn ||
        experienceChanged ||
        !!input.answers ||
        !!input.achievements;
      if (shouldRegenerate) {
        const profession = input.profession ?? existing.profession;
        const fullName = input.fullName ?? existing.fullName;
        const title = input.title ?? existing.title;
        const experience = input.experience ?? existing.experience;
        generatedCoverLetter = this.coverLetterGenerator.generate({
          fullName,
          title,
          professionLabel: getProfessionByKey(profession)?.label ?? profession,
          summary: generatedSummary ?? existing.generatedSummary,
          topExperience: pickTopExperience(experience),
        });
      }
    }

    const updated = await this.resumes.update(resumeId, {
      ...input,
      generatedSummary,
      generatedBullets,
      coverLetterEnabled,
      generatedCoverLetter,
      recruiterModeEnabled,
      referencesEnabled,
    });
    const resume = new Resume(updated!);
    await this.analytics.recordScoreSnapshot(resume.id, resume.strengthScore);
    return resume;
  }

  async delete(userId: string, resumeId: string): Promise<void> {
    await this.getOwned(userId, resumeId); // throws if not found/owned
    await this.resumes.delete(resumeId);
  }

  async getPublicBySlug(slug: string, password?: string, requestingUserId?: string): Promise<Resume> {
    const record = await this.resumes.findBySlug(slug);
    if (!record) throw new ResumeNotFoundError("Resume not found.");
    const resume = new Resume(record);
    const isOwner = !!requestingUserId && requestingUserId === resume.userId;
    // Checked ahead of the general isAccessibleBy() below so an expired link
    // reports a distinct reason ("expired") instead of just looking like a
    // wrong password — the owner can still always open their own resume.
    if (!isOwner && resume.isPasswordExpired) {
      throw new ResumeAccessError("This link has expired and is no longer accessible.", "expired");
    }
    if (!resume.isAccessibleBy(requestingUserId, password)) {
      throw new ResumeAccessError(
        resume.visibility === LinkVisibility.PasswordProtected
          ? "This resume is password-protected."
          : "This resume is private — only the owner can view it.",
        resume.visibility === LinkVisibility.PasswordProtected ? "password" : "private"
      );
    }
    await this.resumes.incrementViewCount(record.id);
    await this.analytics.recordView(record.id);
    return resume;
  }
}
