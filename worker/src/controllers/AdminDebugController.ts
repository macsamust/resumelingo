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
 * The local-dev-only hard block (CLIENT_ORIGIN check) is TEMPORARILY
 * DISABLED (Sep 7 2026) so QA can fire this once against production for the
 * GATE/KW/CAR test pass — today's 15:00 UTC cron tick already ran before the
 * test account existed, so the only way to test today without waiting for
 * tomorrow's tick is a manual run. Re-enable the block (uncomment below)
 * once that test pass is done — this should not stay live in production.
 */
export class AdminDebugController {
  runResumeRefreshNudge = async (c: Context<AppEnv>) => {
    // CLIENT_ORIGIN is "http://localhost:5173" locally (see worker/.dev.vars)
    // and "https://resumelingo.com" (or any other real deploy target) in
    // every real environment — the same signal SubscriptionController.ts
    // already reads via c.env.CLIENT_ORIGIN for its own origin fallback.
    //
    // TEMPORARILY DISABLED — see class doc comment above. Restore this
    // check once the current QA pass against production is finished:
    // if (!c.env.CLIENT_ORIGIN.includes("localhost")) {
    //   return c.json({ error: "This tool is only available in local development." }, 403);
    // }
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
