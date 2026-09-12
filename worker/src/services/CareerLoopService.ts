import { CareerLoopProgress, JobApplicationRecord, SubscriptionTier } from "../types";
import { CareerLoopProgressRepository } from "../repositories/CareerLoopProgressRepository";
import { JobApplicationRepository } from "../repositories/JobApplicationRepository";

/**
 * Computes and updates progress for the "Full Circle" post-publish coach —
 * see docs/full-circle-coach-build-brief.md. Resume-scoped: a user can have
 * several resumes, each running its own independent loop.
 *
 * Deliberately mixed storage: Share and Letters are explicit events (there
 * is no other durable signal for either — cover/thank-you letters aren't
 * persisted anywhere, see CoverLetterController/ThankYouLetterController's
 * doc comments), so the client calls markShared/markLettersUsed itself.
 * Track is NOT stored here — it's computed live against job_applications
 * so the coach and the real Application Tracker can never disagree about
 * whether the user has actually logged anything.
 */
export class CareerLoopService {
  constructor(
    private readonly progressRepo: CareerLoopProgressRepository,
    private readonly jobApplicationRepo: JobApplicationRepository
  ) {}

  async getProgress(resumeId: string, userId: string): Promise<CareerLoopProgress> {
    const [row, applications] = await Promise.all([
      this.progressRepo.findByResumeId(resumeId),
      this.jobApplicationRepo.findAllForUser(userId),
    ]);

    const track = applications.some((a: JobApplicationRecord) => a.resumeId === resumeId);
    const share = !!row?.sharedAt;
    const letters = !!row?.lettersAt;

    return {
      resume: true,
      share,
      track,
      letters,
      dismissedUntil: row?.dismissedUntil ?? null,
      completed: share && track && letters,
    };
  }

  async markShared(resumeId: string, userId: string): Promise<void> {
    await this.progressRepo.markShared(resumeId, userId);
  }

  /** Premium-only, same gate ThankYouLetterController/CoverLetterController already enforce on generation itself — this just records that a Premium user actually used one of those tools against this resume. Non-Premium callers should never reach this (nothing in the UI would surface the CTA), but it's a harmless no-op if they somehow do, rather than a hard error. */
  async markLettersUsed(resumeId: string, userId: string, tier: SubscriptionTier): Promise<void> {
    if (tier !== SubscriptionTier.Premium) return;
    await this.progressRepo.markLettersUsed(resumeId, userId);
  }

  /** 7-day snooze — see CareerLoopProgressRepository.dismiss's doc comment. */
  async dismiss(resumeId: string, userId: string): Promise<void> {
    const dismissedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await this.progressRepo.dismiss(resumeId, userId, dismissedUntil);
  }
}

/** Reads Env.CAREER_LOOP_ENABLED — see wrangler.jsonc's `vars` entry. Wrangler vars are always strings, never real booleans, hence the literal "true" comparison rather than a truthy check (an unset var and a var set to "false" both correctly evaluate to disabled here). */
export function isCareerLoopEnabled(env: { CAREER_LOOP_ENABLED?: string }): boolean {
  return env.CAREER_LOOP_ENABLED === "true";
}
