import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/**
 * Self-service admin account security actions — separate from
 * AdminManagementController (which is about managing *other* admin
 * accounts) since everything here only ever acts on the calling admin's
 * own account, not a `:id` param.
 */
export class AdminSecurityController {
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
