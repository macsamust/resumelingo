import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { EmailService } from "./EmailService";
import { AuthService } from "./AuthService";

/**
 * Cron job, every 15 minutes (see wrangler.jsonc's `triggers.crons`), that
 * clears out bot/abandoned accounts — pinned in TODO.md's "Bogus/unverified
 * account protection" entry (Sep 2026). CJ's reasoning: this app's
 * onboarding flow is "sign up, then immediately get interviewed into your
 * first resume" — there is no legitimate path where a real signup sits on
 * zero resumes for a full day. An account that's still unverified AND still
 * has zero resumes an hour later is overwhelmingly bot/junk, not a hesitant
 * real user.
 *
 * Two-step, not a single delete pass: `SUSPEND_AFTER_HOURS` (1 — matching
 * the verification link's own TTL) suspends the account and emails a fresh
 * verification link (UserRepository.suspendForUnverifiedEmail also marks
 * `staleAccountWarnedAt` so this step never re-fires for the same account),
 * then `DELETE_AFTER_HOURS` (24) actually removes it. Suspending rather than
 * deleting outright at the 1h mark gives a genuine user a 23-hour recovery
 * window via the fresh link this step sends — see EmailService's
 * sendAccountSuspendedEmail and AuthService's generateFreshVerificationUrl.
 * Deletion reuses the exact same cascade AdminUserController's
 * admin-triggered delete uses (resumes first, then the account) even though
 * these accounts should always have zero resumes by construction — cheap
 * insurance against the eligibility query and the delete step ever drifting
 * out of sync with each other.
 *
 * Every 15 minutes (not hourly, and not daily like every other cron job in
 * this app) specifically because the suspend window is only 1 hour — an
 * hourly tick's worst case (an account created just after the hour) delayed
 * suspension by up to ~2h instead of ~1h, found via QA testing the real
 * timing (Sep 8, 2026). 15-minute resolution caps the worst case at ~1h15m.
 *
 * `PROTECTED_BEFORE_ISO` grandfathers in every account that already existed
 * when this feature shipped (Sep 8, 2026) — same precedent as migration
 * 0017 grandfathering `emailVerified` for pre-existing accounts rather than
 * retroactively applying a new rule to accounts that predate it. CJ was
 * explicit this must not touch any current account, prod test accounts
 * included, even ones that happen to be unverified with zero resumes today.
 * Only accounts *created* on or after this cutoff are ever eligible.
 */
const SUSPEND_AFTER_HOURS = 1;
const DELETE_AFTER_HOURS = 24;
const PROTECTED_BEFORE_ISO = "2026-09-08T00:00:00.000Z";

export interface StaleAccountCleanupSummary {
  suspended: number;
  suspendFailed: number;
  deleted: number;
}

export class StaleAccountCleanupService {
  constructor(
    private readonly users: UserRepository,
    private readonly resumes: ResumeRepository,
    private readonly email: EmailService,
    private readonly auth: AuthService
  ) {}

  async run(): Promise<StaleAccountCleanupSummary> {
    const summary: StaleAccountCleanupSummary = { suspended: 0, suspendFailed: 0, deleted: 0 };

    const toSuspend = await this.users.findEligibleForSuspension(SUSPEND_AFTER_HOURS, PROTECTED_BEFORE_ISO);
    for (const userRecord of toSuspend) {
      try {
        const verifyUrl = await this.auth.generateFreshVerificationUrl(userRecord.id);
        if (!verifyUrl) continue; // account vanished between the query and here — nothing to do
        const hoursUntilDeletion = DELETE_AFTER_HOURS - SUSPEND_AFTER_HOURS;
        await this.email.sendAccountSuspendedEmail(userRecord.email, verifyUrl, hoursUntilDeletion);
        await this.users.suspendForUnverifiedEmail(userRecord.id, new Date().toISOString());
        summary.suspended++;
      } catch (err) {
        console.error("Stale account suspension failed for user", userRecord.id, err);
        summary.suspendFailed++;
      }
    }

    // Independent of the suspend step above — see findEligibleForStalePurge's
    // doc comment for why deletion doesn't wait on the account having been
    // suspended first.
    const toDelete = await this.users.findEligibleForStalePurge(DELETE_AFTER_HOURS, PROTECTED_BEFORE_ISO);
    for (const userRecord of toDelete) {
      await this.resumes.deleteAllForUser(userRecord.id);
      await this.users.delete(userRecord.id);
      summary.deleted++;
    }

    return summary;
  }
}
