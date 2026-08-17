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

  updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    const { name, email, profession } = req.body ?? {};
    const user = await this.authService.updateProfile(req.user!.id, { name, email, profession });
    res.json({ user: user.toPublicJSON() });
  };

  changePassword = async (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required." });
    }
    await this.authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ success: true });
  };

  forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    if (!email) {
      return res.status(400).json({ error: "email is required." });
    }
    await this.authService.requestPasswordReset(email);
    // Always the same response, whether or not the email matched an account.
    res.json({ success: true });
  };

  resetPassword = async (req: Request, res: Response) => {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: "token and newPassword are required." });
    }
    await this.authService.resetPassword(token, newPassword);
    res.json({ success: true });
  };
}
