import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./types";
import { withServices } from "./middleware/servicesMiddleware";
import { fetchWithEdgeSecurity } from "./middleware/edgeSecurity";
import { createServices } from "./services/createServices";
import authRoutes from "./routes/auth.routes";
import resumeRoutes from "./routes/resume.routes";
import resumeImportRoutes from "./routes/resumeImport.routes";
import achievementGenerateRoutes from "./routes/achievementGenerate.routes";
import professionRoutes from "./routes/profession.routes";
import templateRoutes from "./routes/template.routes";
import publicRoutes from "./routes/public.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import skillSuggestionRoutes from "./routes/skillSuggestion.routes";
import adminRoutes from "./routes/admin.routes";
import careerCoachRoutes from "./routes/careerCoach.routes";
import thankYouLetterRoutes from "./routes/thankYouLetter.routes";
import coverLetterRoutes from "./routes/coverLetter.routes";
import marketingEventRoutes from "./routes/marketingEvent.routes";
import webhookRoutes from "./routes/webhooks.routes";
import jobApplicationRoutes from "./routes/jobApplication.routes";
import resumeRefreshRoutes from "./routes/resumeRefresh.routes";
import { AuthError, InvalidResetTokenError, InvalidVerificationTokenError } from "./services/AuthService";
import { InvalidUnsubscribeTokenError } from "./controllers/AuthController";
import { InvalidNudgeTokenError } from "./controllers/ResumeRefreshController";
import { AdminAuthError } from "./services/AdminService";
import {
  AccessPasswordRequiredError,
  ActiveToggleAccessError,
  CloneAccessError,
  EmailVerificationRequiredError,
  GeneratedContentTooLargeError,
  PhotoTooLargeError,
  RecruiterAccessCodeRequiredError,
  RecruiterCodeInvalidError,
  ResumeAccessError,
  ResumeLimitError,
  ResumeNotFoundError,
  TemplateAccessError,
  VersionHistoryAccessError,
  VersionNotFoundError,
  VisibilityAccessError,
} from "./services/ResumeService";
import { ResumeImportError } from "./services/ResumeImportService";
import { AchievementGenerateError } from "./services/AchievementGeneratorService";
import { SkillSuggestionAiError } from "./services/SkillSuggestionAiService";
import { CareerCoachGenerateError } from "./services/CareerCoachGenerator";
import { ContentGenerateError } from "./services/ContentGenerator";
import { CoverLetterGenerateError } from "./services/CoverLetterGenerator";
import {
  JobApplicationAccessError,
  JobApplicationInvalidStatusError,
  JobApplicationLimitError,
  JobApplicationNotFoundError,
  JobApplicationTierAccessError,
  JobApplicationTooLargeError,
} from "./services/JobApplicationService";

/**
 * Entry point for the whole Worker. wrangler.jsonc's `run_worker_first` is
 * `true` so this fetch handler sees HTML and API traffic alike — required
 * for the HTTP→HTTPS redirect and browser security headers in
 * edgeSecurity.ts (SEC-01 / SEC-02). Static files and SPA routes still
 * land here: Hono has no page routes, so the notFound handler falls back
 * to the ASSETS binding for anything outside /api/*, which serves the
 * real file if one exists, or index.html (via `not_found_handling:
 * "single-page-application"` in wrangler.jsonc) so React Router can take
 * over client-side. Only /api/* misses still return the JSON 404.
 */
const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (_origin, c) => c.env.CLIENT_ORIGIN || "*",
  })
);
app.use("/api/*", withServices);

app.get("/api/health", (c) => c.json({ status: "ok", service: "resumelingo-worker" }));
app.route("/api/auth", authRoutes);
app.route("/api/resumes", resumeRoutes);
// Deliberately its own top-level path, not nested under /api/resumes/*
// (e.g. /api/resumes/import) — resumeRoutes is itself a Hono sub-app
// mounted at that prefix, so a path under it would either collide with its
// POST /:id/... routes or depend on Hono's exact not-found fallthrough
// behavior between two app.route() calls sharing a prefix. A separate
// top-level path avoids that ambiguity entirely.
app.route("/api/resume-import", resumeImportRoutes);
// Same "own top-level path" reasoning as resume-import above.
app.route("/api/achievement-generate", achievementGenerateRoutes);
app.route("/api/professions", professionRoutes);
app.route("/api/templates", templateRoutes);
app.route("/api/public", publicRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/subscriptions", subscriptionRoutes);
app.route("/api/skill-suggestions", skillSuggestionRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/career-coach", careerCoachRoutes);
app.route("/api/thank-you-letters", thankYouLetterRoutes);
app.route("/api/cover-letters", coverLetterRoutes);
app.route("/api/marketing-events", marketingEventRoutes);
app.route("/api/webhooks", webhookRoutes);
app.route("/api/job-applications", jobApplicationRoutes);
app.route("/api/resume-refresh", resumeRefreshRoutes);

app.onError((err, c) => {
  const status =
    err instanceof AuthError
      ? 401
      : err instanceof AdminAuthError
      ? 401
      : err instanceof ResumeNotFoundError
      ? 404
      : err instanceof ResumeAccessError
      ? 403
      : err instanceof JobApplicationNotFoundError
      ? 404
      : err instanceof JobApplicationAccessError
      ? 403
      : err instanceof JobApplicationTierAccessError
      ? 402
      : err instanceof JobApplicationTooLargeError
      ? 400
      : err instanceof JobApplicationInvalidStatusError
      ? 400
      : err instanceof JobApplicationLimitError
      // 429 (not 402 like ResumeLimitError) — this cap isn't an upgrade
      // gate, there's no paid tier that raises it, just a flat backstop.
      ? 429
      : err instanceof ResumeLimitError
      ? 402
      : err instanceof TemplateAccessError
      ? 402
      : err instanceof VisibilityAccessError
      ? 402
      : err instanceof EmailVerificationRequiredError
      ? 403
      : err instanceof CloneAccessError
      ? 402
      : err instanceof ActiveToggleAccessError
      ? 402
      : err instanceof VersionHistoryAccessError
      ? 402
      : err instanceof VersionNotFoundError
      ? 404
      : err instanceof PhotoTooLargeError
      ? 400
      : err instanceof GeneratedContentTooLargeError
      ? 400
      : err instanceof RecruiterAccessCodeRequiredError
      ? 400
      : err instanceof AccessPasswordRequiredError
      ? 400
      : err instanceof RecruiterCodeInvalidError
      ? 403
      : err instanceof InvalidResetTokenError
      ? 400
      : err instanceof InvalidUnsubscribeTokenError
      ? 400
      : err instanceof InvalidNudgeTokenError
      ? 400
      : err instanceof InvalidVerificationTokenError
      ? 400
      : err instanceof ResumeImportError
      ? 502
      : err instanceof AchievementGenerateError
      ? 502
      : err instanceof SkillSuggestionAiError
      ? 502
      : err instanceof CareerCoachGenerateError
      ? 502
      : err instanceof ContentGenerateError
      ? 502
      : err instanceof CoverLetterGenerateError
      ? 502
      : 500;
  if (status === 500) console.error(err);
  const reason = err instanceof ResumeAccessError ? err.reason : undefined;
  return c.json({ error: err.message || "Unexpected server error.", ...(reason ? { reason } : {}) }, status);
});

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Route not found." }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return fetchWithEdgeSecurity(request, (incoming) => app.fetch(incoming, env, ctx));
  },
  /**
   * Fired by any of the four Cron Triggers in wrangler.jsonc's
   * `triggers.crons` — "0 14 * * 1" (weekly, the view digest), "0 13 * * *"
   * (daily, the security monitor added Sep 2026), "0 15 * * *" (daily,
   * the AI Resume Refresh nudge added Sep 2026), or the every-15-minutes
   * expression (see wrangler.jsonc, the stale-account cleanup added Sep
   * 2026 — see StaleAccountCleanupService's doc comment for why this one
   * runs far more often than daily like the others). Told apart by
   * `event.cron` rather than separate exports, since
   * Workers only supports one `scheduled` handler per Worker. `ctx.waitUntil`
   * keeps the invocation alive until whichever job finishes rather than
   * letting the runtime tear it down as soon as this handler returns.
   */
  scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const services = createServices(env);
    if (event.cron === "0 13 * * *") {
      ctx.waitUntil(
        services.securityMonitorService.runDailyCheck().then((summary) => {
          console.log("Daily security monitor run complete", summary);
        })
      );
      return;
    }
    if (event.cron === "0 15 * * *") {
      ctx.waitUntil(
        services.resumeRefreshNudgeService.sendDailyNudges().then((summary) => {
          console.log("Daily resume refresh nudge run complete", summary);
        })
      );
      return;
    }
    if (event.cron === "*/15 * * * *") {
      ctx.waitUntil(
        services.staleAccountCleanupService.run().then((summary) => {
          console.log("Stale account cleanup run complete", summary);
        })
      );
      return;
    }
    ctx.waitUntil(
      services.viewDigestService.sendWeeklyDigests().then((summary) => {
        console.log("Weekly view digest run complete", summary);
      })
    );
  },
};
