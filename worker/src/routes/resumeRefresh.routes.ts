import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { ResumeRefreshController } from "../controllers/ResumeRefreshController";

// Entirely public — every route here is reached from the AI Resume Refresh
// nudge email's no-login link, gated by the signed token itself (see
// ResumeRefreshController's doc comment), never a logged-in session. No
// requireAuth middleware, unlike achievementGenerate.routes.ts's near
// identical-looking keyword-to-bullet endpoint.
const resumeRefresh = new Hono<AppEnv>();
const controller = new ResumeRefreshController();

resumeRefresh.get("/preview", controller.preview);
resumeRefresh.post("/preview-keyword-bullet", controller.previewKeywordBullet);
resumeRefresh.post("/preview-car-bullet", controller.previewCarBullet);
// POST, not a bare GET, for the same anti-prefetch reason as
// AuthController.unsubscribeDigest — this is the one route here that
// actually mutates the resume, so it must only fire from an explicit click
// on the landing page, not a security scanner prefetching the email's link.
resumeRefresh.post("/commit", controller.commit);

export default resumeRefresh;
