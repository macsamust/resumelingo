import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { User } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const authService = new AuthService();

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = authService.verifyToken(token);
    const user = authService.getUserById(payload.userId);
    if (!user) return res.status(401).json({ error: "User no longer exists." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
