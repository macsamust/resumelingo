import { createMiddleware } from "hono/factory";
import { AppEnv } from "./servicesMiddleware";

/**
 * Hono equivalent of the Express requireAuth middleware. Must run after
 * withServices.
 *
 * Also rejects a suspended account here, not just at login. A JWT is
 * stateless and issued at login time, so without this check, an account
 * suspended *after* a session already started would keep working on every
 * other authenticated route until that token naturally expired — only
 * login() itself blocked a suspended account from getting a *new* token.
 * This isn't an extra D1 read: getUserById() below already runs on every
 * authenticated request (to attach the full user record via c.set), so
 * checking the flag it already returns is free.
 */
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
    if (user.suspended) return c.json({ error: "This account has been suspended. Contact support for help." }, 401);
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token." }, 401);
  }
});

/**
 * Like requireAuth, but never rejects the request — used on public routes
 * (e.g. the resume share page) that behave differently for a logged-in
 * owner but must still work for anonymous visitors. A missing, malformed,
 * or expired token is treated as "anonymous" rather than an error.
 *
 * A suspended account is treated the same way — as anonymous, not as its
 * own error — same reasoning as requireAuth above (a session shouldn't
 * keep its owner-level privileges after suspension), but this middleware's
 * whole contract is "never fail the request," so a suspended visitor just
 * loses their logged-in-owner treatment rather than getting rejected.
 */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    const { authService } = c.get("services");
    try {
      const payload = await authService.verifyToken(token);
      const user = await authService.getUserById(payload.userId);
      if (user && !user.suspended) c.set("user", user);
    } catch {
      // invalid/expired token on a public route — proceed as anonymous
    }
  }
  await next();
});
