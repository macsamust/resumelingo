import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/**
 * Self-service admin account security actions — separate from
 * AdminManagementController (which is about managing *other* admin
 * accounts) since everything here only ever acts on the calling admin's
 * own account, not a `:id` param.
 */
export class AdminSecurityController {
  /** Step 1 of TOTP enrollment — see AdminService.beginTotpEnrollment. Not itself audit-logged (nothing has actually changed yet — totpEnabled only flips on at confirmTotpEnroll below). */
  beginTotpEnroll = async (c: Context<AppEnv>) => {
    const { adminService } = c.get("services");
    const admin = c.get("admin")!;
    const result = await adminService.beginTotpEnrollment(admin.id);
    return c.json(result);
  };

  /** Step 2 — confirms the code from the admin's authenticator app and returns the one-time backup codes in plaintext (only shown here, once — only their hashes are ever stored). */
  confirmTotpEnroll = async (c: Context<AppEnv>) => {
    const { adminService, adminAuditLogRepository } = c.get("services");
    const admin = c.get("admin")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code : "";
    if (!code) return c.json({ error: "code is required." }, 400);

    const backupCodes = await adminService.confirmTotpEnrollment(admin.id, code);
    await adminAuditLogRepository.log(admin, { action: "admin.totp_enable", targetType: "admin", targetId: admin.id, detail: admin.email });
    return c.json({ backupCodes });
  };

  /** Requires the current password again before turning 2FA off — see AdminService.disableTotp. */
  disableTotp = async (c: Context<AppEnv>) => {
    const { adminService, adminAuditLogRepository } = c.get("services");
    const admin = c.get("admin")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) return c.json({ error: "password is required." }, 400);

    await adminService.disableTotp(admin.id, password);
    await adminAuditLogRepository.log(admin, { action: "admin.totp_disable", targetType: "admin", targetId: admin.id, detail: admin.email });
    return c.json({ success: true });
  };

  /**
   * Signs the calling admin out of every session at once (see
   * AdminService.revokeSessions) — including the one making this request,
   * so the client should expect the next authenticated call to fail and
   * redirect to login. Useful if a token might have leaked without needing
   * to change the password too.
   */
  revokeSessions = async (c: Context<AppEnv>) => {
    const { adminService, adminAuditLogRepository } = c.get("services");
    const admin = c.get("admin")!;
    await adminService.revokeSessions(admin.id);
    await adminAuditLogRepository.log(admin, {
      action: "admin.revoke_sessions",
      targetType: "admin",
      targetId: admin.id,
      detail: admin.email,
    });
    return c.json({ success: true });
  };
}
