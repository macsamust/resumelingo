import { CreateJobApplicationInput, JobApplicationRepository, UpdateJobApplicationInput } from "../repositories/JobApplicationRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { UserRepository } from "../repositories/UserRepository";
import { User } from "../models/User";
import { JobApplicationRecord, JobApplicationStatusHistoryEntry, SubscriptionTier } from "../types";

export class JobApplicationNotFoundError extends Error {}
export class JobApplicationAccessError extends Error {}
export class JobApplicationTierAccessError extends Error {}

/** Professional/Premium only — same tier gate as Version History (assertVersionHistoryAllowed in ResumeService.ts), same shape/throw pattern. */
export function assertJobApplicationTrackerAllowed(tier: SubscriptionTier): void {
  if (tier === SubscriptionTier.Professional || tier === SubscriptionTier.Premium) return;
  throw new JobApplicationTierAccessError("Job application tracking requires the Professional or Premium plan. Upgrade to use this feature.");
}

// Same "server-side backstop, client already limits" reasoning as
// ResumeService's MAX_PHOTO_DATA_URL_LENGTH/assertGeneratedContentSizeOk —
// notes is the only genuinely free-text field here.
const MAX_NOTES_LENGTH = 4_000;
const MAX_LINK_LENGTH = 2_000;

export class JobApplicationTooLargeError extends Error {}

export function assertJobApplicationSizeOk(notes: string | undefined, link: string | undefined): void {
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    throw new JobApplicationTooLargeError(`Notes are too long. Please keep them under ${MAX_NOTES_LENGTH.toLocaleString()} characters.`);
  }
  if (link && link.length > MAX_LINK_LENGTH) {
    throw new JobApplicationTooLargeError("That link is too long.");
  }
}

// Unlike resumes (ResumeLimitError, plan-tiered), this isn't a paid-feature
// gate — it's a product-level cap on an active job search, paired with the
// "approaching the limit" warning (JobApplicationsPage.tsx, at 40/80%) and
// the stale-cleanup recommendation below so hitting it is avoidable, not a
// dead end.
export const MAX_APPLICATIONS_PER_USER = 50;
// Matches the "approaching the limit" warning threshold on the client —
// kept here too since JobApplicationController.list exposes it in the
// response so the client doesn't have to hardcode the same number twice.
export const APPLICATIONS_WARNING_THRESHOLD = 40;

export class JobApplicationLimitError extends Error {}

// "Recommend deleting older, outdated applications" — deliberately never
// automatic (see JobApplicationController.deleteStale/cleanupStale route):
// nothing here silently removes a user's data. This only computes *which*
// applications are stale; the client surfaces that as a "clean up" banner
// the user has to click, same ConfirmDialog pattern used for every other
// delete in this app. "Stale" is measured from appliedDate when set
// (the date it actually went out), falling back to createdAt for an
// application that was logged without one.
const STALE_AFTER_MS = 365 * 24 * 60 * 60 * 1000; // ~12 months

function effectiveDateMs(a: JobApplicationRecord): number {
  return new Date(a.appliedDate || a.createdAt).getTime();
}

export function isStaleApplication(a: JobApplicationRecord, now: number = Date.now()): boolean {
  return effectiveDateMs(a) < now - STALE_AFTER_MS;
}

/**
 * Job application tracker — see migrations/0015_job_applications.sql and
 * TODO.md's "Product review" note. Professional/Premium only (see
 * assertJobApplicationTrackerAllowed) — every entry point below checks this
 * first, same "hard-block the whole feature for Starter" treatment Version
 * History gets, not just a soft coercion like Recruiter Mode/References.
 */
export class JobApplicationService {
  constructor(
    private readonly applications: JobApplicationRepository,
    private readonly resumes: ResumeRepository,
    private readonly users: UserRepository
  ) {}

  /** Attaches each application's own statusHistory (see JobApplicationRecord's doc comment) — one extra query for every history row this user has, grouped in memory rather than fetched per application. */
  async listForUser(userId: string): Promise<JobApplicationRecord[]> {
    await this.assertTrackerAllowed(userId);
    const [applications, history] = await Promise.all([
      this.applications.findAllForUser(userId),
      this.applications.findHistoryForUser(userId),
    ]);
    const historyByApp = new Map<string, JobApplicationStatusHistoryEntry[]>();
    for (const { jobApplicationId, status, changedAt } of history) {
      const entries = historyByApp.get(jobApplicationId) ?? [];
      entries.push({ status, changedAt });
      historyByApp.set(jobApplicationId, entries);
    }
    return applications.map((a) => ({ ...a, statusHistory: historyByApp.get(a.id) ?? [] }));
  }

  /** Throws if not found/owned — same shape as ResumeService.getOwned. Does not itself check tier — callers that need the tier gate call assertTrackerAllowed separately, since getOwned alone is also used where a 404/403 (not found/not yours) should take precedence over a tier message. */
  async getOwned(userId: string, id: string): Promise<JobApplicationRecord> {
    const record = await this.applications.findById(id);
    if (!record) throw new JobApplicationNotFoundError("Application not found.");
    if (record.userId !== userId) throw new JobApplicationAccessError("You do not have access to this application.");
    return record;
  }

  async create(userId: string, input: Omit<CreateJobApplicationInput, "userId">): Promise<JobApplicationRecord> {
    await this.assertTrackerAllowed(userId);
    assertJobApplicationSizeOk(input.notes, input.link);
    if (input.resumeId) await this.assertResumeOwned(userId, input.resumeId);
    const count = await this.applications.countForUser(userId);
    if (count >= MAX_APPLICATIONS_PER_USER) {
      throw new JobApplicationLimitError(`You've reached the ${MAX_APPLICATIONS_PER_USER} application limit. Remove an old one to add another.`);
    }
    const application = await this.applications.create({ ...input, userId });
    // Logs the real initial status at the moment it's actually known — not a
    // backfill. Migration 0033's "don't invent history" note is specifically
    // about applications that already existed before this shipped, where the
    // true initial status is genuinely unknown; a brand-new application's
    // creation moment is real data, so recording it here means every
    // application created from now on has a complete, accurate timeline.
    await this.applications.recordStatusChange(application.id, application.status, application.createdAt);
    return application;
  }

  async update(userId: string, id: string, input: UpdateJobApplicationInput): Promise<JobApplicationRecord> {
    await this.assertTrackerAllowed(userId);
    const existing = await this.getOwned(userId, id); // throws if not found/owned
    assertJobApplicationSizeOk(input.notes, input.link);
    if (input.resumeId) await this.assertResumeOwned(userId, input.resumeId);
    const updated = await this.applications.update(id, input);
    // Records a timeline entry only on an actual status change (not just any
    // edit that happens to include `status` unchanged) — see migration
    // 0033's doc comment on why the initial status is never backfilled here.
    // Reverting back to "applied" is deliberately never logged as a new
    // entry, even though it's a real change to the status column: "Applied"
    // is the one-time starting point of the pipeline (already recorded once,
    // at creation, in create() above), not a milestone you re-enter later —
    // a second "Applied" line further down the timeline would just read as
    // confusing, not informative.
    if (input.status !== undefined && input.status !== existing.status && input.status !== "applied") {
      await this.applications.recordStatusChange(id, input.status, updated!.updatedAt);
    }
    return updated!;
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.assertTrackerAllowed(userId);
    await this.getOwned(userId, id); // throws if not found/owned
    await this.applications.delete(id);
  }

  /**
   * Deletes every application of this user's that's over 12 months old (see
   * isStaleApplication) — only ever called from the client's "Clean up old
   * applications" banner after an explicit confirm, never on a schedule.
   * Recomputes staleness itself from this user's own rows rather than
   * trusting a client-supplied id list, so there's no way to pass someone
   * else's id here. Returns how many were removed, for the confirmation
   * toast.
   */
  async deleteStale(userId: string): Promise<number> {
    await this.assertTrackerAllowed(userId);
    const all = await this.applications.findAllForUser(userId);
    const staleIds = all.filter((a) => isStaleApplication(a)).map((a) => a.id);
    if (staleIds.length > 0) await this.applications.deleteBulk(staleIds);
    return staleIds.length;
  }

  /** A resumeId picked from the "Which resume?" dropdown must actually belong to this user — same ownership check as everywhere else, just against the other repository. */
  private async assertResumeOwned(userId: string, resumeId: string): Promise<void> {
    const resume = await this.resumes.findById(resumeId);
    if (!resume || resume.userId !== userId) {
      throw new JobApplicationAccessError("That resume could not be found.");
    }
  }

  /** Looks up this user's current tier and applies the Professional/Premium gate — a missing user record (shouldn't happen for an authenticated request, but see ResumeService.update's same defensive handling) is treated as Starter rather than throwing an unrelated error. */
  private async assertTrackerAllowed(userId: string): Promise<void> {
    const userRecord = await this.users.findById(userId);
    const tier = userRecord ? new User(userRecord).subscriptionTier : SubscriptionTier.Starter;
    assertJobApplicationTrackerAllowed(tier);
  }
}
