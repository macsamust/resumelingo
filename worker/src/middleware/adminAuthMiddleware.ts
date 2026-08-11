import { createMiddleware } from "hono/factory";
import { AppEnv } from "./servicesMiddleware";

/**
 * Hono equivalent of the Express requireAdminAuth middleware. Same shape as
 * requireAuth (see authMiddleware.ts) but verifies against the separate
 * AdminService/admin token, so a user's Bearer token is never accepted
 * here, and vice versa. Must run after withServices.
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
    c.set("admin", admin);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired admin token." }, 401);
  }
});
