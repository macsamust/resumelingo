import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/**
 * TEMPORARY — local dev/QA convenience only, added alongside the AI Resume
 * Refresh nudge build (Sep 2026). `wrangler dev` doesn't fire Cron Triggers
 * on its own (see wrangler.jsonc's comment on `triggers.crons`), so there
 * was previously no way to see a real nudge email or click through the
 * no-login landing page without waiting for a real deploy + a real 24h
 * cron tick. This just calls the same service method the daily cron calls
 * in production, from an admin-only button.
 *
 * Hard-blocked outside local dev (see the CLIENT_ORIGIN check below) — this
 * sends a real email via Resend to whatever account is eligible, and a run
 * against production has no way to know it should point recipients at
 * localhost vs. the real site the way local dev's own CLIENT_ORIGIN does.
 * An admin manually firing production email blasts on a whim isn't a
 * tradeoff worth keeping just to avoid a second local/only check — the
 * daily cron is production's only path to this, by design. Safe to delete
 * entirely once the feature has been in production for a while and no
 * longer needs manual poking locally.
 */
export class AdminDebugController {
  runResumeRefreshNudge = async (c: Context<AppEnv>) => {
    // CLIENT_ORIGIN is "http://localhost:5173" locally (see worker/.dev.vars)
    // and "https://resumelingo.com" (or any other real deploy target) in
    // every real environment — the same signal SubscriptionController.ts
    // already reads via c.env.CLIENT_ORIGIN for its own origin fallback.
    if (!c.env.CLIENT_ORIGIN.includes("localhost")) {
      return c.json({ error: "This tool is only available in local development." }, 403);
    }
    const { resumeRefreshNudgeService, adminAuditLogRepository } = c.get("services");
    const summary = await resumeRefreshNudgeService.sendDailyNudges();
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "debug.run_resume_refresh_nudge",
      targetType: "system",
      detail: `${summary.usersNudged} sent, ${summary.resumesNudged} resumes, ${summary.failed} failed (${summary.eligibleResumes} eligible)`,
    });
    return c.json({ summary });
  };
}
