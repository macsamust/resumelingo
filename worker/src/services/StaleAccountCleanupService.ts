import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { EmailService } from "./EmailService";

/**
 * Hourly cron job (see wrangler.jsonc's `triggers.crons`) that clears out
 * bot/abandoned accounts — pinned in TODO.md's "Bogus/unverified account
 * protection" entry (Sep 2026), picked back up with a much shorter window
 * than originally proposed. CJ's reasoning: this app's onboarding flow is
 * "sign up, then immediately get interviewed into your first resume" — there
 * is no legitimate path where a real signup sits on zero resumes for days.
 * An account that's still unverified AND still has zero resumes a day later
 * is overwhelmingly bot/junk, not a hesitant real user, so a 24h window
 * carries very little false-positive risk here specifically (this reasoning
 * doesn't generalize to a typical SaaS signup funnel — it's specific to this
 * app's own product shape).
 *
 * Two-step, not a single delete pass: `WARN_AFTER_HOURS` (12) sends one
 * warning email per account (UserRepository.markStaleAccountWarned prevents
 * re-sending it every run), then `DELETE_AFTER_HOURS` (24) actually removes
 * the account. Deletion reuses the exact same cascade AdminUserController's
 * admin-triggered delete uses (resumes first, then the account) even though
 * these accounts should always have zero resumes by construction — cheap
 * insurance against the eligibility query and the delete step ever drifting
 * out of sync with each other.
 *
 * Hourly (not daily, unlike every other cron job in this app) specifically
 * because the window is short enough that daily resolution would mean the
 * actual wait before warning/deletion could be anywhere from 24h to 48h
 * rather than a predictable ~24h.
 *
 * `PROTECTED_BEFORE_ISO` grandfathers in every account that already existed
 * when this feature shipped (Sep 8, 2026) — same precedent as migration
 * 0017 grandfathering `emailVerified` for pre-existing accounts rather than
 * retroactively applying a new rule to accounts that predate it. CJ was
 * explicit this must not touch any current account, prod test accounts
 * included, even ones that happen to be unverified with zero resumes today.
 * Only accounts *created* on or after this cutoff are ever eligible.
 */
const WARN_AFTER_HOURS = 12;
const DELETE_AFTER_HOURS = 24;
const PROTECTED_BEFORE_ISO = "2026-09-08T00:00:00.000Z";

export interface StaleAccountCleanupSummary {
  warned: number;
  warnFailed: number;
  deleted: number;
}

export class StaleAccountCleanupService {
  constructor(
    private readonly users: UserRepository,
    private readonly resumes: ResumeRepository,
    private readonly email: EmailService,
    private readonly clientOrigin: string
  ) {}

  private loginUrl(): string {
    return `${this.clientOrigin.replace(/\/$/, "")}/login`;
  }

  async run(): Promise<StaleAccountCleanupSummary> {
    const summary: StaleAccountCleanupSummary = { warned: 0, warnFailed: 0, deleted: 0 };

    const toWarn = await this.users.findEligibleForStaleWarning(WARN_AFTER_HOURS, PROTECTED_BEFORE_ISO);
    for (const userRecord of toWarn) {
      try {
        const hoursUntilDeletion = DELETE_AFTER_HOURS - WARN_AFTER_HOURS;
        await this.email.sendStaleAccountWarningEmail(userRecord.email, this.loginUrl(), hoursUntilDeletion);
        await this.users.markStaleAccountWarned(userRecord.id, new Date().toISOString());
        summary.warned++;
      } catch (err) {
        console.error("Stale account warning failed for user", userRecord.id, err);
        summary.warnFailed++;
      }
    }

    // Independent of the warning step above — see findEligibleForStalePurge's
    // doc comment for why deletion doesn't wait on staleAccountWarnedAt.
    const toDelete = await this.users.findEligibleForStalePurge(DELETE_AFTER_HOURS, PROTECTED_BEFORE_ISO);
    for (const userRecord of toDelete) {
      await this.resumes.deleteAllForUser(userRecord.id);
      await this.users.delete(userRecord.id);
      summary.deleted++;
    }

    return summary;
  }
}
