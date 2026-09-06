import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { isValidEmail } from "../utils/validation";
import { AuthError, InvalidVerificationTokenError } from "../services/AuthService";

/** Thrown when an unsubscribe link's token is missing, malformed, expired, or signed for a different purpose — mapped to 400 in index.ts's onError, same treatment as InvalidResetTokenError. */
export class InvalidUnsubscribeTokenError extends Error {}

/** Failed verify-email attempts from a single IP before it's throttled — guards against scripted token-guessing. The token itself (256-bit random, hashed at rest) isn't realistically brute-forceable at any window length; this is defense in depth against scripted abuse, not the primary protection. */
const MAX_VERIFY_FAILURES = 10;
const VERIFY_WINDOW_MINUTES = 15;
/** Resend requests from a single IP before it's throttled — guards against spamming Resend's send quota / a user's own inbox, not against guessing anything. */
const MAX_RESEND_ATTEMPTS = 5;
const RESEND_WINDOW_MINUTES = 60;
/** Forgot-password requests from a single IP before it's throttled — same email-bombing concern as resend above (anyone could otherwise spam an arbitrary victim's inbox with reset emails just by posting their address repeatedly), not a guessing concern. Purely IP-scoped, same limitation as every other rate limit in this codebase (AdminLoginIpLogRepository included) — an attacker rotating IPs isn't stopped by this alone, but it closes the "one-click infinite spam" case. */
const MAX_FORGOT_PASSWORD_ATTEMPTS = 5;
const FORGOT_PASSWORD_WINDOW_MINUTES = 60;
/** Failed login attempts from a single IP before it's throttled — same "guard against scripted guessing" concern as verify above, just against a human-chosen password instead of a 256-bit token. bcrypt already slows each individual guess, but that's not a substitute for actually capping attempts; AdminAuthController.login has had this same protection since the admin console shipped, this just closes the equivalent gap on subscriber login. Failure-only (a legitimate user who gets it right doesn't count against their own limit), same treatment as verify. */
const MAX_LOGIN_FAILURES = 10;
const LOGIN_WINDOW_MINUTES = 15;
/**
 * Registration requests from a single IP before it's throttled — closes the
 * gap flagged in the Sep 2026 "Bogus/unverified account protection" TODO
 * entry: previously nothing limited or logged /api/auth/register at all, so
 * a script could create unlimited accounts. Recorded on every attempt
 * regardless of outcome (like resend below), not failure-only — the concern
 * here is account-creation volume itself, not guessing anything. Same
 * acknowledged limitation as every other IP-based throttle in this codebase
 * (an attacker rotating IPs isn't stopped by this alone) — Cloudflare
 * Turnstile is the stronger single lever if that's ever added, a separate,
 * bigger decision.
 */
const MAX_REGISTER_ATTEMPTS = 5;
const REGISTER_WINDOW_MINUTES = 60;

/** Same CF-Connecting-IP / x-forwarded-for fallback as AdminAuthController.login. */
function clientIp(c: Context<AppEnv>): string {
  return c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";
}

export class AuthController {
  register = async (c: Context<AppEnv>) => {
    const { authService, emailVerificationIpLogRepository, securityAlertService } = c.get("services");
    const ip = clientIp(c);
    const recentAttempts = await emailVerificationIpLogRepository.countRecentAttempts(ip, "register", REGISTER_WINDOW_MINUTES);
    if (recentAttempts >= MAX_REGISTER_ATTEMPTS) {
      await securityAlertService.recordIfNew({
        type: "register_burst",
        severity: "warning",
        ip,
        detail: { attempts: recentAttempts },
        dedupeWindowMinutes: REGISTER_WINDOW_MINUTES,
      });
      return c.json({ error: "Too many signup attempts from this network. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const { name, email, password, profession } = body as Record<string, string>;
    if (!name || !email || !password) {
      return c.json({ error: "name, email, and password are required." }, 400);
    }
    const { user, token } = await authService.register({ name, email, password, profession });
    await emailVerificationIpLogRepository.recordAttempt(ip, "register");
    await emailVerificationIpLogRepository.pruneOlderThan(REGISTER_WINDOW_MINUTES);
    return c.json({ user: user.toPublicJSON(), token }, 201);
  };

  /**
   * IP-rate-limited on failures only, same shape as verifyEmail below —
   * guards against scripted password-guessing against a known email
   * address. Purely IP-scoped, same limitation as every other rate limit in
   * this codebase (an attacker rotating IPs isn't stopped by this alone).
   */
  login = async (c: Context<AppEnv>) => {
    const { authService, emailVerificationIpLogRepository, securityAlertService } = c.get("services");
    const ip = clientIp(c);
    const recentFailures = await emailVerificationIpLogRepository.countRecentAttempts(ip, "login", LOGIN_WINDOW_MINUTES);
    if (recentFailures >= MAX_LOGIN_FAILURES) {
      await securityAlertService.recordIfNew({
        type: "login_brute_force",
        severity: "critical",
        ip,
        dedupeWindowMinutes: LOGIN_WINDOW_MINUTES,
      });
      return c.json({ error: "Too many login attempts from this network. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const { email, password } = body as Record<string, string>;
    if (!email || !password) {
      return c.json({ error: "email and password are required." }, 400);
    }
    try {
      const { user, token } = await authService.login(email, password);
      return c.json({ user: user.toPublicJSON(), token });
    } catch (err) {
      if (err instanceof AuthError) {
        await emailVerificationIpLogRepository.recordAttempt(ip, "login");
        await emailVerificationIpLogRepository.pruneOlderThan(LOGIN_WINDOW_MINUTES);
      }
      throw err;
    }
  };

  me = async (c: Context<AppEnv>) => {
    const user = c.get("user")!;
    return c.json({ user: user.toPublicJSON() });
  };

  updateProfile = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { name, email, profession } = body;
    const updated = await authService.updateProfile(user.id, {
      name: name as string | undefined,
      email: email as string | undefined,
      profession: profession as string | null | undefined,
    });
    return c.json({ user: updated.toPublicJSON() });
  };

  changePassword = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return c.json({ error: "currentPassword and newPassword are required." }, 400);
    }
    await authService.changePassword(user.id, currentPassword as string, newPassword as string);
    return c.json({ success: true });
  };

  forgotPassword = async (c: Context<AppEnv>) => {
    const { authService, emailVerificationIpLogRepository, securityAlertService } = c.get("services");
    // Checked before anything else, including the format validation below —
    // an attacker probing for the rate limit shouldn't be able to burn zero
    // attempts by sending intentionally-malformed emails first.
    const ip = clientIp(c);
    const recentAttempts = await emailVerificationIpLogRepository.countRecentAttempts(
      ip,
      "password-reset",
      FORGOT_PASSWORD_WINDOW_MINUTES
    );
    if (recentAttempts >= MAX_FORGOT_PASSWORD_ATTEMPTS) {
      await securityAlertService.recordIfNew({
        type: "password_reset_spam",
        severity: "warning",
        ip,
        dedupeWindowMinutes: FORGOT_PASSWORD_WINDOW_MINUTES,
      });
      return c.json({ error: "Too many requests from this network. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const { email } = body as Record<string, string>;
    if (!email) {
      return c.json({ error: "email is required." }, 400);
    }
    // A format check here is safe to answer directly (it says nothing about
    // whether the address is registered) — everything past this point stays
    // on requestPasswordReset's "always resolve the same way" contract.
    if (!isValidEmail(email)) {
      return c.json({ error: "Please enter a valid email address." }, 400);
    }
    await authService.requestPasswordReset(email);
    await emailVerificationIpLogRepository.recordAttempt(ip, "password-reset");
    await emailVerificationIpLogRepository.pruneOlderThan(FORGOT_PASSWORD_WINDOW_MINUTES);
    // Always the same response, whether or not the email matched an account.
    return c.json({ success: true });
  };

  resetPassword = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { token, newPassword } = body as Record<string, string>;
    if (!token || !newPassword) {
      return c.json({ error: "token and newPassword are required." }, 400);
    }
    await authService.resetPassword(token, newPassword);
    return c.json({ success: true });
  };

  /** Logged-in settings-page toggle — see UnsubscribePage.tsx for the no-login-required equivalent reached from the email link. */
  updateEmailPreferences = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.viewDigestOptOut !== "boolean") {
      return c.json({ error: "viewDigestOptOut (boolean) is required." }, 400);
    }
    const updated = await authService.setViewDigestOptOut(user.id, body.viewDigestOptOut);
    return c.json({ user: updated.toPublicJSON() });
  };

  /**
   * Public — no login required, since this is reached from a link in an
   * email. Requires a POST triggered by the user clicking a button on the
   * client's /unsubscribe landing page (see UnsubscribePage.tsx), not a bare
   * GET link, so that an email-security scanner prefetching every link in
   * the message can't silently unsubscribe users on their behalf.
   */
  unsubscribeDigest = async (c: Context<AppEnv>) => {
    const { unsubscribeDigestTokenService, userRepository } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { token } = body as Record<string, string>;
    if (!token) {
      throw new InvalidUnsubscribeTokenError("This unsubscribe link is missing its token.");
    }
    let payload;
    try {
      payload = await unsubscribeDigestTokenService.verify(token);
    } catch {
      throw new InvalidUnsubscribeTokenError("This unsubscribe link is invalid or has expired.");
    }
    if (payload.purpose !== "unsubscribe-digest" || !payload.userId) {
      throw new InvalidUnsubscribeTokenError("This unsubscribe link is invalid or has expired.");
    }
    await userRepository.setViewDigestOptOut(payload.userId, true);
    return c.json({ success: true });
  };

  /**
   * Public — reached from the "Verify email address" link (see
   * EmailService.sendVerificationEmail). Unlike unsubscribe, there's no
   * anti-scanner concern here (a security scanner prefetching the link just
   * verifies the address a little early, which isn't harmful), so this is a
   * plain token-in-body POST from the client's auto-firing /verify-email
   * page rather than requiring a manual button click.
   *
   * IP-rate-limited on failures only — a legitimate user hitting their own
   * real link never counts against the limit, only repeated wrong/expired
   * tokens from the same network do (see EmailVerificationIpLogRepository).
   */
  verifyEmail = async (c: Context<AppEnv>) => {
    const { authService, emailVerificationIpLogRepository, securityAlertService } = c.get("services");
    const ip = clientIp(c);
    const recentFailures = await emailVerificationIpLogRepository.countRecentAttempts(ip, "verify", VERIFY_WINDOW_MINUTES);
    if (recentFailures >= MAX_VERIFY_FAILURES) {
      await securityAlertService.recordIfNew({
        type: "verify_brute_force",
        severity: "warning",
        ip,
        dedupeWindowMinutes: VERIFY_WINDOW_MINUTES,
      });
      return c.json({ error: "Too many attempts from this network. Please try again later." }, 429);
    }

    const body = await c.req.json().catch(() => ({}));
    const { token } = body as Record<string, string>;
    if (!token) {
      return c.json({ error: "token is required." }, 400);
    }
    try {
      await authService.verifyEmail(token);
      return c.json({ success: true });
    } catch (err) {
      if (err instanceof InvalidVerificationTokenError) {
        await emailVerificationIpLogRepository.recordAttempt(ip, "verify");
        await emailVerificationIpLogRepository.pruneOlderThan(VERIFY_WINDOW_MINUTES);
      }
      throw err;
    }
  };

  /**
   * Logged-in-only — see AuthService.resendVerificationEmail for why this
   * doesn't take an email parameter (no enumeration surface to guard
   * against). IP-rate-limited on every call regardless of outcome (unlike
   * verifyEmail above), since the concern here is send-volume/abuse, not
   * guessing — even a "successful" resend still costs a real Resend send.
   */
  resendVerification = async (c: Context<AppEnv>) => {
    const { authService, emailVerificationIpLogRepository, securityAlertService } = c.get("services");
    const ip = clientIp(c);
    const recentAttempts = await emailVerificationIpLogRepository.countRecentAttempts(ip, "resend", RESEND_WINDOW_MINUTES);
    if (recentAttempts >= MAX_RESEND_ATTEMPTS) {
      await securityAlertService.recordIfNew({
        type: "resend_spam",
        severity: "info",
        ip,
        dedupeWindowMinutes: RESEND_WINDOW_MINUTES,
      });
      return c.json({ error: "Too many resend requests from this network. Please try again later." }, 429);
    }

    const user = c.get("user")!;
    await authService.resendVerificationEmail(user.id);
    await emailVerificationIpLogRepository.recordAttempt(ip, "resend");
    await emailVerificationIpLogRepository.pruneOlderThan(RESEND_WINDOW_MINUTES);
    return c.json({ success: true });
  };
}
