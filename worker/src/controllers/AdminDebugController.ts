import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/**
 * TEMPORARY — dev/QA convenience only, added alongside the AI Resume
 * Refresh nudge build (Sep 2026). `wrangler dev` doesn't fire Cron Triggers
 * on its own (see wrangler.jsonc's comment on `triggers.crons`), so there
 * was previously no way to see a real nudge email or click through the
 * no-login landing page without waiting for a real deploy + a real 24h
 * cron tick. This just calls the same service method the daily cron calls
 * in production, from an admin-only button. Safe to remove once the
 * feature has been in production for a while and no longer needs manual
 * poking — it doesn't do anything the cron itself won't also do.
 */
export class AdminDebugController {
  runResumeRefreshNudge = async (c: Context<AppEnv>) => {
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
