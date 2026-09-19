import { Context } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { AppEnv } from "../middleware/servicesMiddleware";
import { isLocalDevelopmentHost } from "../middleware/edgeSecurity";

/**
 * SEC-A01 (Sep 2026): subscriber auth moved from a localStorage JWT sent via
 * Authorization header to these two HttpOnly cookies — see
 * migration 0049_refresh_tokens.sql for the full reasoning. Kept in one
 * place so AuthController's login/register/refresh/changePassword/logout
 * routes (the only call sites that ever set or clear these) can't drift
 * from each other on an attribute.
 *
 * - `rl_session`: the short-lived access-token JWT, sent on every request
 *   (Path=/), same claims/verification as before (see authMiddleware.ts).
 * - `rl_refresh`: the long-lived, revocable opaque refresh token (see
 *   RefreshTokenRepository), scoped to Path=/api/auth so it's never sent on
 *   ordinary API calls — only to the couple of routes that actually need it.
 *
 * Admin auth (its own JWT/secret/middleware — see AdminAuthController) is
 * deliberately NOT touched by this migration; it stays on its own
 * localStorage/Authorization-header mechanism as a separate, later decision.
 */
export const ACCESS_TOKEN_COOKIE = "rl_session";
export const REFRESH_TOKEN_COOKIE = "rl_refresh";

/** 20 minutes — short enough that a leaked access-token cookie self-heals quickly; long enough that a normal editing session doesn't need many silent refreshes. Must match the TTL passed to the `tokenService` TokenService instance in createServices.ts. */
export const ACCESS_TOKEN_TTL_SECONDS = 20 * 60;
/** 30 days — the actual session lifetime a user experiences ("stay logged in"). Bounded blast radius comes from the short access-token TTL above, not from this being short; this is revocable via RefreshTokenRepository the same way tokenVersion already revokes access tokens. */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * `Secure` is skipped only for the local-dev hosts `redirectHttpToHttps`
 * already treats as HTTP-only (`wrangler dev` has no TLS) — every other
 * host, including any preview/staging domain, gets it. Without this, a
 * cookie set with `Secure` on plain http://localhost would simply never be
 * stored by the browser, breaking local dev entirely.
 */
function secureFlag(c: Context<AppEnv>): boolean {
  return !isLocalDevelopmentHost(new URL(c.req.url).hostname);
}

/** Sets both auth cookies after a successful login/register/refresh/password-change. */
export function setAuthCookies(c: Context<AppEnv>, accessToken: string, refreshToken?: string): void {
  const secure = secureFlag(c);
  setCookie(c, ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  if (refreshToken) {
    setCookie(c, REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "Lax",
      path: "/api/auth",
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    });
  }
}

/** Clears both cookies on logout (and anywhere else a session should end immediately rather than waiting out its TTL). */
export function clearAuthCookies(c: Context<AppEnv>): void {
  const secure = secureFlag(c);
  deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: "/", secure, sameSite: "Lax" });
  deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: "/api/auth", secure, sameSite: "Lax" });
}
