import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/** Thrown when an unsubscribe link's token is missing, malformed, expired, or signed for a different purpose — mapped to 400 in index.ts's onError, same treatment as InvalidResetTokenError. */
export class InvalidUnsubscribeTokenError extends Error {}

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
}
