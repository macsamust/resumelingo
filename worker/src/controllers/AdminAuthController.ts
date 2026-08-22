import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { AdminAuthError } from "../services/AdminService";

/** Failed attempts from a single IP, across any admin email, before that IP is blocked outright — see AdminAuthController.login. */
const MAX_IP_FAILURES = 20;
const IP_WINDOW_MINUTES = 15;

export class AdminAuthController {
  login = async (c: Context<AppEnv>) => {
    const { adminService, adminLoginIpLogRepository } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { email, password } = body as Record<string, string>;
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
      return c.json({ error: "Too many login attempts from this network. Please try again later." }, 429);
    }

    try {
      const { admin, token } = await adminService.login(email, password);
      return c.json({ admin: admin.toPublicJSON(), token });
    } catch (err) {
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
