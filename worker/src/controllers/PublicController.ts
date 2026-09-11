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
  /**
   * Shared by getBySlug (always called with password=undefined — a plain
   * page load is never a password attempt) and unlockPassword (the POST
   * route, called with whatever the visitor submitted). Kept as one method
   * so the throttle/error-shape logic can't drift between the two callers.
   */
  private loadAndThrottle = async (c: Context<AppEnv>, password: string | undefined) => {
    const { resumeService, publicResumePasswordIpLogRepository, securityAlertService } = c.get("services");
    const slug = c.req.param("slug")!;
    const user = c.get("user");
    const ip = c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";

    // Cheap early exit only — NOT the authoritative throttle decision (see
    // recordFailureIfUnderLimit below for why a plain read-then-later-write
    // like this has a race under concurrent requests). This just skips
    // attempting the password check at all when we're already obviously
    // well over budget, saving the work.
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
        // The authoritative decision: recordFailureIfUnderLimit's own atomic
        // SQL statement re-checks the count as part of the same write, so a
        // burst of concurrent wrong guesses can't all slip through on a
        // stale read the way the early exit above could in isolation.
        const recorded = await publicResumePasswordIpLogRepository.recordFailureIfUnderLimit(
          ip,
          slug,
          PASSWORD_WINDOW_MINUTES,
          MAX_PASSWORD_FAILURES
        );
        await publicResumePasswordIpLogRepository.pruneOlderThan(PASSWORD_WINDOW_MINUTES);
        if (!recorded) {
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
      throw err;
    }
  };

  /** Never reads a password from the query string — see unlockPassword below for why. A plain load of a password-protected link just gets the "password required" response; the visitor's actual attempt goes through that POST route instead. */
  getBySlug = async (c: Context<AppEnv>) => this.loadAndThrottle(c, undefined);

  /**
   * POST, not a `?password=` query string on getBySlug (which is how this
   * used to work) — a password sitting in a URL lands in server access
   * logs, browser history, and any Referer header sent onward. Same fix
   * already applied to the recruiter code below; this closes the identical,
   * longer-standing gap for the resume's own password.
   */
  unlockPassword = async (c: Context<AppEnv>) => {
    const body = await c.req.json().catch(() => ({} as { password?: string }));
    const password = typeof body.password === "string" ? body.password : undefined;
    return this.loadAndThrottle(c, password);
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

    // Cheap early exit only, same caveat as getBySlug's own pre-check above
    // — the authoritative decision is recordFailureIfUnderLimit below.
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
        // The authoritative decision — see
        // PublicResumeRecruiterCodeIpLogRepository.recordFailureIfUnderLimit's
        // doc comment for why this (not the plain pre-check above) is what
        // actually closes the race a burst of concurrent wrong guesses could
        // otherwise slip through.
        const recorded = await publicResumeRecruiterCodeIpLogRepository.recordFailureIfUnderLimit(
          ip,
          slug,
          RECRUITER_CODE_WINDOW_MINUTES,
          MAX_RECRUITER_CODE_FAILURES
        );
        await publicResumeRecruiterCodeIpLogRepository.pruneOlderThan(RECRUITER_CODE_WINDOW_MINUTES);
        if (!recorded) {
          await securityAlertService.recordIfNew({
            type: "recruiter_code_guessing",
            severity: "critical",
            ip,
            detail: { slug },
            dedupeWindowMinutes: RECRUITER_CODE_WINDOW_MINUTES,
          });
          return c.json({ error: "Too many attempts from this network. Please try again later." }, 429);
        }
      }
      throw err;
    }
  };
}
