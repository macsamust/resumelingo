import { CreateJobApplicationInput, JobApplicationRepository, UpdateJobApplicationInput } from "../repositories/JobApplicationRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { JobApplicationRecord } from "../types";

export class JobApplicationNotFoundError extends Error {}
export class JobApplicationAccessError extends Error {}

// Same "server-side backstop, client already limits" reasoning as
// ResumeService's MAX_PHOTO_DATA_URL_LENGTH/assertGeneratedContentSizeOk —
// notes is the only genuinely free-text field here.
const MAX_NOTES_LENGTH = 4_000;
const MAX_LINK_LENGTH = 2_000;

export class JobApplicationTooLargeError extends Error {}

export function assertJobApplicationSizeOk(notes: string | undefined, link: string | undefined): void {
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    throw new JobApplicationTooLargeError(`Notes are too long — please keep them under ${MAX_NOTES_LENGTH.toLocaleString()} characters.`);
  }
  if (link && link.length > MAX_LINK_LENGTH) {
    throw new JobApplicationTooLargeError("That link is too long.");
  }
}

// Unlike resumes (ResumeLimitError, plan-tiered), this isn't a paid-feature
// gate — it's a flat backstop against a runaway client bug or scripted abuse
// creating unbounded rows, same "generous, won't affect real usage" spirit
// as MAX_GENERATED_BULLETS_COUNT. 500 tracked applications is far beyond any
// real job search.
const MAX_APPLICATIONS_PER_USER = 500;

export class JobApplicationLimitError extends Error {}

/**
 * Job application tracker — see migrations/0015_job_applications.sql and
 * TODO.md's "Product review" note. Deliberately not tier-gated (unlike
 * Version History/Clone/ATS Check): tracking where a resume was sent isn't a
 * resource cost the way an extra resume slot or a premium template is, so
 * every subscriber gets it.
 */
export class JobApplicationService {
  constructor(private readonly applications: JobApplicationRepository, private readonly resumes: ResumeRepository) {}

  async listForUser(userId: string): Promise<JobApplicationRecord[]> {
    return this.applications.findAllForUser(userId);
  }

  /** Throws if not found/owned — same shape as ResumeService.getOwned. */
  async getOwned(userId: string, id: string): Promise<JobApplicationRecord> {
    const record = await this.applications.findById(id);
    if (!record) throw new JobApplicationNotFoundError("Application not found.");
    if (record.userId !== userId) throw new JobApplicationAccessError("You do not have access to this application.");
    return record;
  }

  async create(userId: string, input: Omit<CreateJobApplicationInput, "userId">): Promise<JobApplicationRecord> {
    assertJobApplicationSizeOk(input.notes, input.link);
    if (input.resumeId) await this.assertResumeOwned(userId, input.resumeId);
    const count = await this.applications.countForUser(userId);
    if (count >= MAX_APPLICATIONS_PER_USER) {
      throw new JobApplicationLimitError(`You've reached the ${MAX_APPLICATIONS_PER_USER}-application limit — remove an old one to add another.`);
    }
    return this.applications.create({ ...input, userId });
  }

  async update(userId: string, id: string, input: UpdateJobApplicationInput): Promise<JobApplicationRecord> {
    await this.getOwned(userId, id); // throws if not found/owned
    assertJobApplicationSizeOk(input.notes, input.link);
    if (input.resumeId) await this.assertResumeOwned(userId, input.resumeId);
    const updated = await this.applications.update(id, input);
    return updated!;
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id); // throws if not found/owned
    await this.applications.delete(id);
  }

  /** A resumeId picked from the "Which resume?" dropdown must actually belong to this user — same ownership check as everywhere else, just against the other repository. */
  private async assertResumeOwned(userId: string, resumeId: string): Promise<void> {
    const resume = await this.resumes.findById(resumeId);
    if (!resume || resume.userId !== userId) {
      throw new JobApplicationAccessError("That resume could not be found.");
    }
  }
}
