import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { AdminAuditLogRepository } from "../repositories/AdminAuditLogRepository";
import { EmailService } from "./EmailService";
import { AuthService } from "./AuthService";

/**
 * Cron job, every 15 minutes (see wrangler.jsonc's `triggers.crons`), that
 * suspends unverified accounts and deletes bot/abandoned ones — pinned in
 * TODO.md's "Bogus/unverified account protection" entry (Sep 2026).
 *
 * Suspension (`SUSPEND_AFTER_HOURS`, 1 — matching the verification link's
 * own TTL) applies to EVERY unverified account, resumes or not (CJ, Sep
 * 2026: "there should be a suspension, even those accounts with resumes...
 * to make sure these are legitimate email addresses no matter how many
 * resumes there are added.") — see UserRepository.findEligibleForSuspension.
 *
 * Deletion (`DELETE_AFTER_HOURS`, 96) also applies to every unverified
 * account, resumes or not, on one shared clock — CJ, Sep 2026, after
 * briefly considering a shorter 24h window for zero-resume accounts and a
 * longer 96h one for resume-owning accounts: "Lets make both deletion
 * windows 96 to keep things simple." See
 * UserRepository.findEligibleForStalePurge.
 *
 * Suspending rather than deleting outright at the 1h mark gives a genuine
 * user a recovery window via the fresh link this step sends — see
 * EmailService.sendAccountSuspendedEmail (which still branches its wording,
 * though not its countdown, on hasResumes — telling a resume-owning account
 * "no resume has been created" would be false) and
 * AuthService.generateFreshVerificationUrl. Deletion reuses the exact same
 * cascade AdminUserController's admin-triggered delete uses (resumes first,
 * then the account).
 *
 * Every suspend and delete this job performs is also written to the same
 * admin_audit_log an admin's own manual suspend/delete goes to — via
 * AdminAuditLogRepository.logSystem, using the literal "system" as the
 * actor rather than a real Admin — so CJ (or any admin) can see these
 * automatic actions in the same Audit Log page instead of them being
 * invisible outside server logs (CJ, Sep 2026: "I'd like to keep track of
 * all admin activities in the system," after noticing this job's actions
 * weren't showing up there at all).
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
const DELETE_AFTER_HOURS = 96;
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
    private readonly auth: AuthService,
    private readonly auditLog: AdminAuditLogRepository
  ) {}

  async run(): Promise<StaleAccountCleanupSummary> {
    const summary: StaleAccountCleanupSummary = { suspended: 0, suspendFailed: 0, deleted: 0 };

    const toSuspend = await this.users.findEligibleForSuspension(SUSPEND_AFTER_HOURS, PROTECTED_BEFORE_ISO);
    for (const userRecord of toSuspend) {
      try {
        const verifyUrl = await this.auth.generateFreshVerificationUrl(userRecord.id);
        if (!verifyUrl) continue; // account vanished between the query and here — nothing to do
        const hoursUntilDeletion = DELETE_AFTER_HOURS - SUSPEND_AFTER_HOURS;
        await this.email.sendAccountSuspendedEmail(userRecord.email, verifyUrl, userRecord.hasResumes, hoursUntilDeletion);
        await this.users.suspendForUnverifiedEmail(userRecord.id, new Date().toISOString());
        // Reuses AdminUserController's own "user.suspend" action code (see
        // logSystem's doc comment) rather than a separate code, so this
        // shows up identically to an admin's manual suspend in the Audit
        // Log's Action filter — only the "system" in the Admin column tells
        // the two apart.
        await this.auditLog.logSystem({
          action: "user.suspend",
          targetType: "user",
          targetId: userRecord.id,
          detail: `Automatic — unverified email past ${SUSPEND_AFTER_HOURS}h`,
        });
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
      await this.auditLog.logSystem({
        action: "user.delete",
        targetType: "user",
        targetId: userRecord.id,
        detail: `Automatic — unverified email past ${DELETE_AFTER_HOURS}h`,
      });
      summary.deleted++;
    }

    return summary;
  }
}
