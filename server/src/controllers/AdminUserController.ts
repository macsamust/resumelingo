import { Response } from "express";
import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { User } from "../models/User";
import { Resume } from "../models/Resume";
import { AdminAuthenticatedRequest } from "../middleware/adminAuthMiddleware";
import { SubscriptionTier } from "../types";

export class AdminUserController {
  constructor(
    private readonly users: UserRepository = new UserRepository(),
    private readonly resumes: ResumeRepository = new ResumeRepository()
  ) {}

  /** Every account plus subscription tier and resume count — the admin dashboard's main user list. */
  list = async (_req: AdminAuthenticatedRequest, res: Response) => {
    const records = await this.users.findAll();
    const users = await Promise.all(
      records.map(async (record) => {
        const user = new User(record);
        const resumeCount = await this.users.countResumesForUser(user.id);
        return { ...user.toPublicJSON(), suspended: user.suspended, resumeCount };
      })
    );
    res.json({ users });
  };

  /** A single user's resumes, for the admin's "view a user's resume details" drill-down. */
  resumesForUser = async (req: AdminAuthenticatedRequest, res: Response) => {
    const records = await this.resumes.findAllForUser(req.params.id);
    res.json({ resumes: records.map((r) => new Resume(r).toJSON()) });
  };

  changeTier = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { tier } = req.body ?? {};
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return res.status(400).json({ error: "Invalid subscription tier." });
    }
    const existing = await this.users.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found." });
    await this.users.updateSubscriptionTier(req.params.id, tier);
    const record = await this.users.findById(req.params.id);
    res.json({ user: new User(record!).toPublicJSON() });
  };

  setSuspended = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { suspended } = req.body ?? {};
    const existing = await this.users.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found." });
    await this.users.setSuspended(req.params.id, !!suspended);
    res.json({ success: true });
  };

  resetPassword = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { newPassword } = req.body ?? {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: "newPassword must be at least 8 characters." });
    }
    const existing = await this.users.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found." });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePasswordHash(req.params.id, passwordHash);
    res.json({ success: true });
  };

  /** Deletes the account and every resume it owns (resumes.userId has a FK to users, so resumes must go first). */
  remove = async (req: AdminAuthenticatedRequest, res: Response) => {
    const existing = await this.users.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found." });
    await this.resumes.deleteAllForUser(req.params.id);
    await this.users.delete(req.params.id);
    res.json({ success: true });
  };
}
