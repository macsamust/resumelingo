import { Context } from "hono";
import bcrypt from "bcryptjs";
import { AppEnv } from "../middleware/servicesMiddleware";
import { Admin } from "../models/Admin";

/**
 * Lets an admin invite/remove other admin accounts from the UI. Previously
 * the only way to create a second admin was the one-time bootstrap
 * (ADMIN_EMAIL/ADMIN_PASSWORD Worker secrets, see AdminService.ensureBootstrapAdmin)
 * or hand-writing SQL directly against D1 — there was no in-app path to add
 * a co-admin at all.
 */
export class AdminManagementController {
  /** Every admin account (no password hashes) — see Admin.toPublicJSON. */
  list = async (c: Context<AppEnv>) => {
    const { adminRepository } = c.get("services");
    const records = await adminRepository.findAll();
    return c.json({ admins: records.map((r) => new Admin(r).toPublicJSON()) });
  };

  create = async (c: Context<AppEnv>) => {
    const { adminRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!name || !email) return c.json({ error: "name and email are required." }, 400);
    if (password.length < 8) return c.json({ error: "password must be at least 8 characters." }, 400);

    const existing = await adminRepository.findByEmail(email);
    if (existing) return c.json({ error: "An admin with that email already exists." }, 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await adminRepository.create({ name, email, passwordHash });
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "admin.create",
      targetType: "admin",
      targetId: created.id,
      detail: email,
    });
    return c.json({ admin: new Admin(created).toPublicJSON() }, 201);
  };

  /**
   * Deleting an admin has two safety rails a normal delete doesn't need:
   * you can't remove yourself (would lock the person performing the action
   * out mid-session with no recovery path but direct DB access) and you
   * can't remove the last remaining admin (would lock everyone out of the
   * admin console entirely).
   */
  remove = async (c: Context<AppEnv>) => {
    const { adminRepository, adminAuditLogRepository } = c.get("services");
    const id = c.req.param("id")!;
    const actingAdmin = c.get("admin")!;
    if (id === actingAdmin.id) {
      return c.json({ error: "You can't remove your own admin account." }, 400);
    }
    const existing = await adminRepository.findById(id);
    if (!existing) return c.json({ error: "Admin not found." }, 404);
    const totalAdmins = await adminRepository.count();
    if (totalAdmins <= 1) {
      return c.json({ error: "Can't remove the last remaining admin account." }, 400);
    }
    await adminRepository.delete(id);
    await adminAuditLogRepository.log(actingAdmin, {
      action: "admin.delete",
      targetType: "admin",
      targetId: id,
      detail: existing.email,
    });
    return c.json({ success: true });
  };
}
