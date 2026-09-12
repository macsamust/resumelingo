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

// Applies to every request (not just /api/*) — a pentest pass found
// http://resumelingo.com/ served the SPA over plain HTTP with no redirect,
// a first-visit MITM window since HSTS (below) can't protect a request that
// was never HTTPS to begin with. Cloudflare's dashboard has an "Always Use
// HTTPS" zone setting that covers this at the edge, but that's account
// configuration outside this repo and easy to silently drift (a zone
// re-provision, a new domain added without checking the setting) — this
// app-level redirect makes the behavior a durable part of the codebase
// instead of a fact about the Cloudflare account.
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  // Exempt localhost so `wrangler dev` (which serves plain HTTP) keeps
  // working — only ever matters for local development, since the real
  // domain always terminates as HTTPS at Cloudflare's edge.
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol === "http:" && !isLocalhost) {
    url.protocol = "https:";
    return c.redirect(url.toString(), 301);
  }
  await next();
});

// Standard hardening headers on every response. None of these were present
// before (flagged in the Sep 2026 pentest pass) — HSTS pins the browser to
// HTTPS for future visits (pairs with the redirect above), CSP/X-Frame-
// Options are defense-in-depth against XSS/clickjacking, and the rest are
// low-cost best practice with no functional downside for this app.
app.use("*", async (c, next) => {
  await next();
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  // 'unsafe-inline'/'unsafe-eval' on script-src are required by the current
  // Vite-built client bundle (no nonce/hash pipeline yet) — tightening this
  // further needs a build-time change, tracked separately, not something to
  // silently narrow here and break the app. style-src/font-src allow Google
  // Fonts (see client/index.html's preconnect + stylesheet link — the only
  // third-party origins the app actually loads from). Checkout/billing goes
  // through a full-page redirect to Stripe's hosted page (see
  // DashboardPage's `window.location.href = url`), not an embedded
  // Stripe.js/iframe, so no stripe.com allowance is needed here — add one
  // if that ever changes to an embedded Elements/Checkout flow.
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
});

// CLIENT_ORIGIN is a required var in wrangler.jsonc (set for both prod and
// local dev — see .dev.vars) and should always be present. The old fallback
// here was `c.env.CLIENT_ORIGIN || "*"`: if that var were ever missing
// (a misconfigured preview/staging env, a future refactor, a typo in
// wrangler.jsonc), CORS would silently fail OPEN — reflecting every request
// as if it came from the real site, for every origin on the internet, with
// no error or log to notice it happened. Auth here uses a Bearer token
// rather than cookies, so a wildcard alone can't be used to ride a victim's
// session (no ambient credential a hostile page can piggyback on), but it
// would still let any site read responses from resumelingo's public API
// endpoints server-to-browser, which is unnecessary exposure with zero
// upside. Fail closed instead: fall back to the known production origin so
// a missing var narrows access rather than removing it entirely.
const PRODUCTION_ORIGIN = "https://resumelingo.com";
app.use(
  "/api/*",
  cors({
    origin: (_origin, c) => c.env.CLIENT_ORIGIN || PRODUCTION_ORIGIN,
  })
);
app.use("/api/*", withServices);

// Deliberately doesn't name the internal service ("resumelingo-worker") or
// expose any other implementation detail — a pentest pass flagged the old
// response as low-severity info disclosure. This endpoint is unauthenticated
// by design (used for uptime checks), so it should say only "it's up."
app.get("/api/health", (c) => c.json({ status: "ok" }));
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
  fetch: app.fetch,
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
