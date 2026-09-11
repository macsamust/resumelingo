import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { RecruiterCodeInvalidError, ResumeAccessError } from "../services/ResumeService";

/** Wrong-password attempts against one resume slug from one IP before it's throttled — closes a gap the Sep 2026 security-anomaly scoping found: guessing a password-protected public resume's password had zero friction and zero trace. See PublicResumePasswordIpLogRepository's doc comment for why this is keyed by (ip, slug) rather than a blanket per-IP count. */
const MAX_PASSWORD_FAILURES = 10;
const PASSWORD_WINDOW_MINUTES = 15;

/** Same shape as the password throttle above, own budget/table (see PublicResumeRecruiterCodeIpLogRepository) — closes the Sep 2026 finding that Recruiter Mode's card had no access control of its own at all. */
const MAX_RECRUITER_CODE_FAILURES = 10;
const RECRUITER_CODE_WINDOW_MINUTES = 15;

export class PublicController {
  getBySlug = async (c: Context<AppEnv>) => {
    const { resumeService, publicResumePasswordIpLogRepository, securityAlertService } = c.get("services");
    const slug = c.req.param("slug")!;
    const password = c.req.query("password");
    const user = c.get("user");
    const ip = c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";

    // Only checked once a password has actually been submitted — a plain
    // page load prompting for a password isn't a guess, so it shouldn't
    // burn down this slug's attempt budget the way a wrong guess should.
    if (password) {
      const recentFailures = await publicResumePasswordIpLogRepository.countRecentFailures(ip, slug, PASSWORD_WINDOW_MINUTES);
      if (recentFailures >= MAX_PASSWORD_FAILURES) {
        await securityAlertService.recordIfNew({
          type: "public_resume_password_guessing",
          severity: "critical",
          ip,
          detail: { slug },
          dedupeWindowMinutes: PASSWORD_WINDOW_MINUTES,
        });
        return c.json({ error: "Too many attempts from this network. Please try again later." }, 429);
      }
    }

    try {
      const resume = await resumeService.getPublicBySlug(slug, password, user?.id);
      return c.json({ resume: resume.toPublicJSON() });
    } catch (err) {
      // Only a wrong password counts against the throttle — "private"/
      // "inactive"/"expired" reasons aren't password guesses at all, and
      // counting them would throttle someone who just bookmarked a link
      // that got deactivated, not an attacker.
      if (password && err instanceof ResumeAccessError && err.reason === "password") {
        await publicResumePasswordIpLogRepository.recordFailure(ip, slug);
        await publicResumePasswordIpLogRepository.pruneOlderThan(PASSWORD_WINDOW_MINUTES);
      }
      throw err;
    }
  };

  /**
   * POST, not GET — deliberately breaks from getBySlug's `?password=` query
   * string pattern above. A recruiter code sitting in a query string would
   * land in server access logs, browser history, and any Referer header sent
   * onward, exactly the weakness the Sep 2026 review flagged in the existing
   * password flow. Body-only avoids all three.
   */
  unlockRecruiterCard = async (c: Context<AppEnv>) => {
    const { resumeService, publicResumeRecruiterCodeIpLogRepository, securityAlertService } = c.get("services");
    const slug = c.req.param("slug")!;
    const body = await c.req.json().catch(() => ({} as { code?: string; password?: string }));
    const code = typeof body.code === "string" ? body.code : "";
    const password = typeof body.password === "string" ? body.password : undefined;
    const user = c.get("user");
    const ip = c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";

    const recentFailures = await publicResumeRecruiterCodeIpLogRepository.countRecentFailures(
      ip,
      slug,
      RECRUITER_CODE_WINDOW_MINUTES
    );
    if (recentFailures >= MAX_RECRUITER_CODE_FAILURES) {
      await securityAlertService.recordIfNew({
        type: "recruiter_code_guessing",
        severity: "critical",
        ip,
        detail: { slug },
        dedupeWindowMinutes: RECRUITER_CODE_WINDOW_MINUTES,
      });
      return c.json({ error: "Too many attempts from this network. Please try again later." }, 429);
    }

    try {
      const recruiterCard = await resumeService.unlockRecruiterCard(slug, code, password, user?.id);
      return c.json({ recruiterCard });
    } catch (err) {
      if (err instanceof RecruiterCodeInvalidError) {
        await publicResumeRecruiterCodeIpLogRepository.recordFailure(ip, slug);
        await publicResumeRecruiterCodeIpLogRepository.pruneOlderThan(RECRUITER_CODE_WINDOW_MINUTES);
      }
      throw err;
    }
  };
}
