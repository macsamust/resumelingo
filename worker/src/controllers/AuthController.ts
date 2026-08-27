import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { isValidEmail } from "../utils/validation";
import { InvalidVerificationTokenError } from "../services/AuthService";

/** Thrown when an unsubscribe link's token is missing, malformed, expired, or signed for a different purpose — mapped to 400 in index.ts's onError, same treatment as InvalidResetTokenError. */
export class InvalidUnsubscribeTokenError extends Error {}

/** Failed verify-email attempts from a single IP before it's throttled — guards against scripted token-guessing. The token itself (256-bit random, hashed at rest) isn't realistically brute-forceable at any window length; this is defense in depth against scripted abuse, not the primary protection. */
const MAX_VERIFY_FAILURES = 10;
const VERIFY_WINDOW_MINUTES = 15;
/** Resend requests from a single IP before it's throttled — guards against spamming Resend's send quota / a user's own inbox, not against guessing anything. */
const MAX_RESEND_ATTEMPTS = 5;
const RESEND_WINDOW_MINUTES = 60;

/** Same CF-Connecting-IP / x-forwarded-for fallback as AdminAuthController.login. */
function clientIp(c: Context<AppEnv>): string {
  return c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";
}

export class AuthController {
  register = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { name, email, password, profession } = body as Record<string, string>;
    if (!name || !email || !password) {
      return c.json({ error: "name, email, and password are required." }, 400);
    }
    const { user, token } = await authService.register({ name, email, password, profession });
    return c.json({ user: user.toPublicJSON(), token }, 201);
  };

  login = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { email, password } = body as Record<string, string>;
    if (!email || !password) {
      return c.json({ error: "email and password are required." }, 400);
    }
    const { user, token } = await authService.login(email, password);
    return c.json({ user: user.toPublicJSON(), token });
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
    const { authService } = c.get("services");
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
    const { authService, emailVerificationIpLogRepository } = c.get("services");
    const ip = clientIp(c);
    const recentFailures = await emailVerificationIpLogRepository.countRecentAttempts(ip, "verify", VERIFY_WINDOW_MINUTES);
    if (recentFailures >= MAX_VERIFY_FAILURES) {
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
    const { authService, emailVerificationIpLogRepository } = c.get("services");
    const ip = clientIp(c);
    const recentAttempts = await emailVerificationIpLogRepository.countRecentAttempts(ip, "resend", RESEND_WINDOW_MINUTES);
    if (recentAttempts >= MAX_RESEND_ATTEMPTS) {
      return c.json({ error: "Too many resend requests from this network. Please try again later." }, 429);
    }

    const user = c.get("user")!;
    await authService.resendVerificationEmail(user.id);
    await emailVerificationIpLogRepository.recordAttempt(ip, "resend");
    await emailVerificationIpLogRepository.pruneOlderThan(RESEND_WINDOW_MINUTES);
    return c.json({ success: true });
  };
}
