import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { AppEnv } from "./servicesMiddleware";
import { ACCESS_TOKEN_COOKIE } from "../utils/authCookies";

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
 *
 * Also checks the token's `tokenVersion` claim against the user's current
 * value (bumped by AuthService.changePassword/resetPassword/revokeSessions)
 * — same reasoning, and the identical check requireAdminAuth already does
 * for admin sessions. Without this, a JWT would otherwise stay valid for
 * its full lifetime even after a password change or an explicit "log out
 * of all other devices," with no way to force an earlier logout.
 *
 * SEC-A01 (Sep 2026): reads the `rl_session` HttpOnly cookie instead of an
 * `Authorization: Bearer` header — see utils/authCookies.ts. The access
 * token itself is unchanged (same JWT, same claims, same 401-on-expiry
 * behavior); only where it's carried changed. The client is expected to
 * silently call POST /api/auth/refresh and retry on a 401 here before
 * treating it as a real logout — see client/src/api/ApiClient.ts.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, ACCESS_TOKEN_COOKIE);
  if (!token) {
    return c.json({ error: "Missing or expired session." }, 401);
  }
  const { authService } = c.get("services");

  try {
    const payload = await authService.verifyToken(token);
    const user = await authService.getUserById(payload.userId);
    if (!user) return c.json({ error: "User no longer exists." }, 401);
    if (user.suspended) return c.json({ error: "This account has been suspended. Contact support at support@resumelingo.com for help." }, 401);
    if (payload.tokenVersion !== user.tokenVersion) {
      return c.json({ error: "This session has been signed out. Please log in again." }, 401);
    }
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
  const token = getCookie(c, ACCESS_TOKEN_COOKIE);
  if (token) {
    const { authService } = c.get("services");
    try {
      const payload = await authService.verifyToken(token);
      const user = await authService.getUserById(payload.userId);
      // Same tokenVersion check as requireAuth — a signed-out (password
      // changed/reset, or explicit "log out everywhere") token shouldn't
      // grant owner-level treatment on a public route either.
      if (user && !user.suspended && payload.tokenVersion === user.tokenVersion) c.set("user", user);
    } catch {
      // invalid/expired token on a public route — proceed as anonymous
    }
  }
  await next();
});
