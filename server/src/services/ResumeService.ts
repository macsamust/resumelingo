import { ResumeRepository, UpdateResumeInput } from "../repositories/ResumeRepository";
import { UserRepository } from "../repositories/UserRepository";
import { IContentGenerator, RuleBasedContentGenerator } from "./ContentGenerator";
import { Resume } from "../models/Resume";
import { User } from "../models/User";
import { AchievementEntry, AwardEntry, EducationEntry, LinkVisibility, WorkExperienceEntry } from "../types";

export class ResumeLimitError extends Error {}
export class ResumeNotFoundError extends Error {}
export class ResumeAccessError extends Error {}

export interface CreateResumeRequest {
  fullName?: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
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
    private readonly generator: IContentGenerator = new RuleBasedContentGenerator()
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

    const generated = this.generator.generate(input.profession, input.answers, input.achievements ?? []);
    const record = await this.resumes.create({
      userId: user.id,
      // Defaults to the account holder's name, but is editable per resume —
      // e.g. someone building a resume for a different display name/nickname.
      fullName: input.fullName?.trim() || user.name,
      title: input.title,
      profession: input.profession,
      templateKey: input.templateKey,
      visibility: input.visibility ?? LinkVisibility.Public,
      accessPassword: input.accessPassword ?? null,
      answers: input.answers,
      experience: input.experience ?? [],
      education: input.education ?? [],
      awards: input.awards ?? [],
      achievements: input.achievements ?? [],
      generatedSummary: generated.summary,
      generatedBullets: generated.bullets,
    });
    return new Resume(record);
  }

  async update(userId: string, resumeId: string, input: UpdateResumeInput): Promise<Resume> {
    const existing = await this.getOwned(userId, resumeId); // throws if not found/owned

    // Regenerate content if the answers or achievements changed, so editing
    // stays "live." Either one can arrive alone (the edit page always sends
    // both together, but this stays correct even if a caller doesn't), so
    // whichever wasn't provided falls back to what's already saved.
    let generatedSummary = input.generatedSummary;
    let generatedBullets = input.generatedBullets;
    if (input.answers || input.achievements) {
      const answers = input.answers ?? existing.answers;
      const achievements = input.achievements ?? existing.achievements;
      const generated = this.generator.generate(existing.profession, answers, achievements);
      generatedSummary = generated.summary;
      generatedBullets = generated.bullets;
    }

    const updated = await this.resumes.update(resumeId, { ...input, generatedSummary, generatedBullets });
    return new Resume(updated!);
  }

  async delete(userId: string, resumeId: string): Promise<void> {
    await this.getOwned(userId, resumeId); // throws if not found/owned
    await this.resumes.delete(resumeId);
  }

  async getPublicBySlug(slug: string, password?: string): Promise<Resume> {
    const record = await this.resumes.findBySlug(slug);
    if (!record) throw new ResumeNotFoundError("Resume not found.");
    const resume = new Resume(record);
    if (!resume.isAccessibleWithout(password)) {
      throw new ResumeAccessError(
        resume.visibility === LinkVisibility.PasswordProtected
          ? "This resume is password-protected."
          : "This resume is private."
      );
    }
    await this.resumes.incrementViewCount(record.id);
    return resume;
  }
}
