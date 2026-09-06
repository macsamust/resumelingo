import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { AdminAuthError, TotpRequiredError } from "../services/AdminService";

/** Failed attempts from a single IP, across any admin email, before that IP is blocked outright — see AdminAuthController.login. */
const MAX_IP_FAILURES = 20;
const IP_WINDOW_MINUTES = 15;

export class AdminAuthController {
  /**
   * Two-step client flow when 2FA is enabled: this endpoint is called once
   * with just email+password, throws TotpRequiredError (handled below,
   * distinct from AdminAuthError), and the client re-submits the same
   * request with totpCode added. A missing/wrong 2FA code never counts as
   * an IP-level failure the way a wrong password does (see the catch
   * block) — needing to enter a second factor is a normal part of this
   * flow, not an attack signal, so it shouldn't burn down the IP's attempt
   * budget the way repeated wrong passwords should.
   */
  login = async (c: Context<AppEnv>) => {
    const { adminService, adminLoginIpLogRepository, securityAlertService } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { email, password, totpCode } = body as Record<string, string>;
    if (!email || !password) {
      return c.json({ error: "email and password are required." }, 400);
    }

    // Cloudflare sets CF-Connecting-IP on every request that reaches a
    // Worker; x-forwarded-for is a fallback for local `wrangler dev`, where
    // that header isn't present. Per-account lockout (see AdminService.login)
    // only slows down brute-forcing one specific email — this catches an
    // attacker rotating across many admin emails (or guessing non-existent
    // ones) from the same network.
    const ip = c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";
    const recentFailures = await adminLoginIpLogRepository.countRecentFailures(ip, IP_WINDOW_MINUTES);
    if (recentFailures >= MAX_IP_FAILURES) {
      await securityAlertService.recordIfNew({
        type: "admin_login_brute_force",
        severity: "critical",
        ip,
        detail: { attemptedEmail: email },
        dedupeWindowMinutes: IP_WINDOW_MINUTES,
      });
      return c.json({ error: "Too many login attempts from this network. Please try again later." }, 429);
    }

    try {
      const { admin, token } = await adminService.login(email, password, totpCode);
      return c.json({ admin: admin.toPublicJSON(), token });
    } catch (err) {
      if (err instanceof TotpRequiredError) {
        return c.json({ error: err.message, reason: "totp_required" }, 401);
      }
      if (err instanceof AdminAuthError) {
        await adminLoginIpLogRepository.recordFailure(ip);
        await adminLoginIpLogRepository.pruneOlderThan(IP_WINDOW_MINUTES);
      }
      throw err;
    }
  };

  me = async (c: Context<AppEnv>) => {
    const admin = c.get("admin")!;
    return c.json({ admin: admin.toPublicJSON() });
  };
}
