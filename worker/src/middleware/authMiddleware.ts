import { createMiddleware } from "hono/factory";
import { AppEnv } from "./servicesMiddleware";

/** Hono equivalent of the Express requireAuth middleware. Must run after withServices. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header." }, 401);
  }
  const token = header.slice("Bearer ".length);
  const { authService } = c.get("services");

  try {
    const payload = await authService.verifyToken(token);
    const user = await authService.getUserById(payload.userId);
    if (!user) return c.json({ error: "User no longer exists." }, 401);
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token." }, 401);
  }
});
