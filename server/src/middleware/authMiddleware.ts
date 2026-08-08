import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { User } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

const authService = new AuthService();

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = authService.verifyToken(token);
    const user = await authService.getUserById(payload.userId);
    if (!user) return res.status(401).json({ error: "User no longer exists." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

/**
 * Like requireAuth, but never rejects the request — used on public routes
 * (e.g. the resume share page) that behave differently for a logged-in
 * owner but must still work for anonymous visitors. A missing, malformed,
 * or expired token is treated as "anonymous" rather than an error.
 */
export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    try {
      const payload = authService.verifyToken(token);
      const user = await authService.getUserById(payload.userId);
      if (user) req.user = user;
    } catch {
      // invalid/expired token on a public route — proceed as anonymous
    }
  }
  next();
}
