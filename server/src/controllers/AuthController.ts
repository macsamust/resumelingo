import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) {}

  register = async (req: Request, res: Response) => {
    const { name, email, password, profession } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required." });
    }
    const { user, token } = await this.authService.register({ name, email, password, profession });
    res.status(201).json({ user: user.toPublicJSON(), token });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required." });
    }
    const { user, token } = await this.authService.login(email, password);
    res.json({ user: user.toPublicJSON(), token });
  };

  me = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user!.toPublicJSON() });
  };
}
