import { Context } from "hono";
import bcrypt from "bcryptjs";
import { AppEnv } from "../middleware/servicesMiddleware";
import { User } from "../models/User";
import { Resume } from "../models/Resume";
import { SubscriptionTier } from "../types";

/**
 * Hono version of server/'s AdminUserController. Reads userRepository/
 * resumeRepository directly off `services` (see createServices.ts) rather
 * than being constructed with its own repository instances — Workers have
 * no shared module-level state, so every repository is built fresh per
 * request by servicesMiddleware and handed to controllers via context,
 * same pattern as every other controller in this codebase.
 */
export class AdminUserController {
  /** Every account plus subscription tier and resume count — the admin dashboard's main user list. */
  list = async (c: Context<AppEnv>) => {
    const { userRepository } = c.get("services");
    const records = await userRepository.findAll();
    const users = await Promise.all(
      records.map(async (record) => {
        const user = new User(record);
        const resumeCount = await userRepository.countResumesForUser(user.id);
        return { ...user.toPublicJSON(), suspended: user.suspended, resumeCount };
      })
    );
    return c.json({ users });
  };

  /** A single user's resumes, for the admin's "view a user's resume details" drill-down. */
  resumesForUser = async (c: Context<AppEnv>) => {
    const { resumeRepository } = c.get("services");
    const records = await resumeRepository.findAllForUser(c.req.param("id")!);
    return c.json({ resumes: records.map((r) => new Resume(r).toJSON()) });
  };

  changeTier = async (c: Context<AppEnv>) => {
    const { userRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const tier = body.tier as SubscriptionTier;
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return c.json({ error: "Invalid subscription tier." }, 400);
    }
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);
    await userRepository.updateSubscriptionTier(id, tier);
    const record = await userRepository.findById(id);
    return c.json({ user: new User(record!).toPublicJSON() });
  };

  setSuspended = async (c: Context<AppEnv>) => {
    const { userRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);
    await userRepository.setSuspended(id, !!body.suspended);
    return c.json({ success: true });
  };

  resetPassword = async (c: Context<AppEnv>) => {
    const { userRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const newPassword = body.newPassword;
    if (!newPassword || String(newPassword).length < 8) {
      return c.json({ error: "newPassword must be at least 8 characters." }, 400);
    }
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);
    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await userRepository.updatePasswordHash(id, passwordHash);
    return c.json({ success: true });
  };

  /** Deletes the account and every resume it owns (resumes.userId references users, so resumes must go first). */
  remove = async (c: Context<AppEnv>) => {
    const { userRepository, resumeRepository } = c.get("services");
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);
    await resumeRepository.deleteAllForUser(id);
    await userRepository.delete(id);
    return c.json({ success: true });
  };
}
