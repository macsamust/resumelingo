import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./types";
import { withServices } from "./middleware/servicesMiddleware";
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
import webhookRoutes from "./routes/webhooks.routes";
import jobApplicationRoutes from "./routes/jobApplication.routes";
import { AuthError, InvalidResetTokenError, InvalidVerificationTokenError } from "./services/AuthService";
import { InvalidUnsubscribeTokenError } from "./controllers/AuthController";
import { AdminAuthError } from "./services/AdminService";
import {
  ActiveToggleAccessError,
  CloneAccessError,
  GeneratedContentTooLargeError,
  PhotoTooLargeError,
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
import { CareerCoachGenerateError } from "./services/CareerCoachGenerator";
import { ContentGenerateError } from "./services/ContentGenerator";
import { CoverLetterGenerateError } from "./services/CoverLetterGenerator";
import {
  JobApplicationAccessError,
  JobApplicationLimitError,
  JobApplicationNotFoundError,
  JobApplicationTierAccessError,
  JobApplicationTooLargeError,
} from "./services/JobApplicationService";

/**
 * Entry point for the whole Worker. wrangler.jsonc's `run_worker_first` is
 * `false` (the installed Wrangler version's schema only supports a plain
 * boolean here, not a per-route array), which means Cloudflare tries a
 * static-asset match first for every request, but still invokes this fetch
 * handler whenever nothing under client/dist matches — including
 * client-side-only routes like /r/:slug (the public resume link) on a
 * fresh page load rather than in-app navigation. Hono's own 404 (below)
 * used to short-circuit those with a hardcoded JSON error instead of
 * letting them reach the real page; the notFound handler now falls back to
 * the ASSETS binding for anything outside /api/*, which serves the actual
 * static file if one exists, or index.html (via `not_found_handling:
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
app.route("/api/webhooks", webhookRoutes);
app.route("/api/job-applications", jobApplicationRoutes);

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
      : err instanceof InvalidResetTokenError
      ? 400
      : err instanceof InvalidUnsubscribeTokenError
      ? 400
      : err instanceof InvalidVerificationTokenError
      ? 400
      : err instanceof ResumeImportError
      ? 502
      : err instanceof AchievementGenerateError
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
  fetch: app.fetch,
  /**
   * Fired by the Cron Trigger in wrangler.jsonc's `triggers.crons`
   * ("0 14 * * 1" — every Monday). The Worker's very first background job
   * — everything else in this app only ever runs on an incoming request.
   * `ctx.waitUntil` keeps the invocation alive until the digest run
   * finishes rather than letting the runtime tear it down as soon as this
   * handler returns.
   */
  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const services = createServices(env);
    ctx.waitUntil(
      services.viewDigestService.sendWeeklyDigests().then((summary) => {
        console.log("Weekly view digest run complete", summary);
      })
    );
  },
};
