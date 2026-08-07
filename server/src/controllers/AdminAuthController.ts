import { Request, Response } from "express";
import { AdminService } from "../services/AdminService";
import { AdminAuthenticatedRequest } from "../middleware/adminAuthMiddleware";

export class AdminAuthController {
  constructor(private readonly adminService: AdminService = new AdminService()) {}

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required." });
    }
    const { admin, token } = await this.adminService.login(email, password);
    res.json({ admin: admin.toPublicJSON(), token });
  };

  me = async (req: AdminAuthenticatedRequest, res: Response) => {
    res.json({ admin: req.admin!.toPublicJSON() });
  };
}
