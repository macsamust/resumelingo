import { NextFunction, Request, Response } from "express";
import { AdminService } from "../services/AdminService";
import { Admin } from "../models/Admin";

export interface AdminAuthenticatedRequest extends Request {
  admin?: Admin;
}

const adminService = new AdminService();

/** Same shape as requireAuth (see middleware/authMiddleware.ts) but verifies against the separate admin token/secret, so a user's Bearer token is never accepted here. */
export async function requireAdminAuth(req: AdminAuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = adminService.verifyToken(token);
    const admin = await adminService.getAdminById(payload.adminId);
    if (!admin) return res.status(401).json({ error: "Admin no longer exists." });
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token." });
  }
}
