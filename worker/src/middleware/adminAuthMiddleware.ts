import { createMiddleware } from "hono/factory";
import { AppEnv } from "./servicesMiddleware";

/**
 * Hono equivalent of the Express requireAdminAuth middleware. Same shape as
 * requireAuth (see authMiddleware.ts) but verifies against the separate
 * AdminService/admin token, so a user's Bearer token is never accepted
 * here, and vice versa. Must run after withServices.
 *
 * Also checks the token's `tokenVersion` claim against the admin's current
 * value (AdminService.revokeSessions bumps it) — a JWT is otherwise
 * stateless and valid until it naturally expires, with no way to force an
 * earlier logout (e.g. a leaked token, a session left open on a shared
 * machine). getAdminById() already runs on every request to attach the
 * admin record via c.set, so this check is free, same reasoning as the
 * equivalent suspended-account check in authMiddleware.ts's requireAuth.
 */
export const requireAdminAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header." }, 401);
  }
  const token = header.slice("Bearer ".length);
  const { adminService } = c.get("services");

  try {
    const payload = await adminService.verifyToken(token);
    const admin = await adminService.getAdminById(payload.adminId);
    if (!admin) return c.json({ error: "Admin no longer exists." }, 401);
    if (payload.tokenVersion !== admin.tokenVersion) {
      return c.json({ error: "This session has been signed out. Please log in again." }, 401);
    }
    c.set("admin", admin);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired admin token." }, 401);
  }
});
