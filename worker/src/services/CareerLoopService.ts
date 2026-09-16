import { CareerLoopProgress, JobApplicationRecord, SubscriptionTier } from "../types";
import { CareerLoopProgressRepository } from "../repositories/CareerLoopProgressRepository";
import { JobApplicationRepository } from "../repositories/JobApplicationRepository";
import { CareerLoopEventRepository, CareerLoopEventStep, CareerLoopEventType } from "../repositories/CareerLoopEventRepository";

/**
 * Computes and updates progress for the "Full Circle" post-publish coach —
 * see docs/full-circle-coach-build-brief.md. Resume-scoped: a user can have
 * several resumes, each running its own independent loop.
 *
 * Deliberately mixed storage: Share and Letters are explicit events (there
 * is no other durable signal for either — a cover letter isn't persisted
 * anywhere, see CoverLetterController's doc comment), so the client calls
 * markShared/markLettersUsed itself. Track is NOT stored here — it's
 * computed live against job_applications so the coach and the real
 * Application Tracker can never disagree about whether the user has
 * actually logged anything.
 *
 * Letters is cover-letter-only, not "cover/thank-you letters" despite the
 * name — only CoverLetterPage.tsx calls markLettersUsed. ThankYouLetterPage
 * is deliberately resume-agnostic (no resumeId at all — see its own doc
 * comment), so there's no resume for a thank-you letter to attribute
 * progress to; wiring it in would mean adding a resume picker to that page
 * first. Decided (Sep 2026) to leave Thank-You Letter as the standalone
 * tool it is rather than take on that scope.
 */
export class CareerLoopService {
  constructor(
    private readonly progressRepo: CareerLoopProgressRepository,
    private readonly jobApplicationRepo: JobApplicationRepository,
    private readonly eventRepo: CareerLoopEventRepository
  ) {}

  /** Fire-and-forget — an analytics-logging failure should never surface as an error on the real action (sharing, writing a letter, opening the badge). */
  private logEvent(resumeId: string, userId: string, type: CareerLoopEventType, step?: CareerLoopEventStep): void {
    this.eventRepo.log(resumeId, userId, type, step).catch(() => {});
  }

  /** Client-triggered events with no other durable signal to derive them from — the badge/modal being opened, or a step's action button/link being clicked. See logEvent's callers below for step_done/completed, which are derived server-side instead. */
  logShown(resumeId: string, userId: string): void {
    this.logEvent(resumeId, userId, "shown");
  }

  logCtaClick(resumeId: string, userId: string, step: CareerLoopEventStep): void {
    this.logEvent(resumeId, userId, "cta_click", step);
  }

  /**
   * Track has no explicit "mark" call the way Share/Letters do — it's
   * derived live from job_applications (see class doc comment above), so
   * there's no single server-side mutation to hang step_done/completed
   * logging off of the way markShared/markLettersUsed do. The client is the
   * only place that actually observes the false-to-true transition (right
   * after creating an application — see JobApplicationsPage.tsx), so it
   * calls this once it's confirmed that transition itself; this just logs
   * it and checks whether the whole loop just completed as a result.
   */
  async logTrackStepDone(resumeId: string, userId: string): Promise<void> {
    this.logEvent(resumeId, userId, "step_done", "track");
    const after = await this.getProgress(resumeId, userId);
    if (after.completed) this.logEvent(resumeId, userId, "completed");
  }

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

  /**
   * Logs "step_done"/"completed" here, server-side, rather than leaving the
   * client to report its own success — this is the one place progress
   * actually changes, so the event log can never drift from the real
   * progress row the way a client-triggered log call could (e.g. if the
   * client crashed or navigated away right after the API call resolved).
   */
  private async logStepDoneAndMaybeCompleted(resumeId: string, userId: string, step: CareerLoopEventStep, wasCompleted: boolean): Promise<void> {
    this.logEvent(resumeId, userId, "step_done", step);
    if (!wasCompleted) {
      const after = await this.getProgress(resumeId, userId);
      if (after.completed) this.logEvent(resumeId, userId, "completed");
    }
  }

  async markShared(resumeId: string, userId: string): Promise<void> {
    const before = await this.getProgress(resumeId, userId);
    await this.progressRepo.markShared(resumeId, userId);
    await this.logStepDoneAndMaybeCompleted(resumeId, userId, "share", before.completed);
  }

  /** Premium-only, same gate ThankYouLetterController/CoverLetterController already enforce on generation itself — this just records that a Premium user actually used one of those tools against this resume. Non-Premium callers should never reach this (nothing in the UI would surface the CTA), but it's a harmless no-op if they somehow do, rather than a hard error. */
  async markLettersUsed(resumeId: string, userId: string, tier: SubscriptionTier): Promise<void> {
    if (tier !== SubscriptionTier.Premium) return;
    const before = await this.getProgress(resumeId, userId);
    await this.progressRepo.markLettersUsed(resumeId, userId);
    await this.logStepDoneAndMaybeCompleted(resumeId, userId, "letters", before.completed);
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
