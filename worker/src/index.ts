import { Hono } from "hono";
import { cors } from "hono/cors";
import { Env } from "./types";
import { withServices } from "./middleware/servicesMiddleware";
import authRoutes from "./routes/auth.routes";
import resumeRoutes from "./routes/resume.routes";
import professionRoutes from "./routes/profession.routes";
import templateRoutes from "./routes/template.routes";
import publicRoutes from "./routes/public.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import { AuthError } from "./services/AuthService";
import { ResumeAccessError, ResumeLimitError, ResumeNotFoundError } from "./services/ResumeService";

/**
 * Entry point for the whole Worker. wrangler.jsonc's `assets` config with
 * `run_worker_first: ["/api/*"]` guarantees every request under /api/*
 * reaches this fetch handler; everything else is served as a static file
 * from client/dist (or falls back to index.html for client-side routes),
 * without ever invoking this code — see wrangler.jsonc for details.
 */
const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (_origin, c) => c.env.CLIENT_ORIGIN || "*",
  })
);
app.use("/api/*", withServices);

app.get("/api/health", (c) => c.json({ status: "ok", service: "websume-worker" }));
app.route("/api/auth", authRoutes);
app.route("/api/resumes", resumeRoutes);
app.route("/api/professions", professionRoutes);
app.route("/api/templates", templateRoutes);
app.route("/api/public", publicRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/subscriptions", subscriptionRoutes);

app.onError((err, c) => {
  const status =
    err instanceof AuthError
      ? 401
      : err instanceof ResumeNotFoundError
      ? 404
      : err instanceof ResumeAccessError
      ? 403
      : err instanceof ResumeLimitError
      ? 402
      : 500;
  if (status === 500) console.error(err);
  const reason = err instanceof ResumeAccessError ? err.reason : undefined;
  return c.json({ error: err.message || "Unexpected server error.", ...(reason ? { reason } : {}) }, status);
});

app.notFound((c) => c.json({ error: "Route not found." }, 404));

export default app;
