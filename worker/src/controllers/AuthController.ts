import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

export class AuthController {
  register = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { name, email, password, profession } = body as Record<string, string>;
    if (!name || !email || !password) {
      return c.json({ error: "name, email, and password are required." }, 400);
    }
    const { user, token } = await authService.register({ name, email, password, profession });
    return c.json({ user: user.toPublicJSON(), token }, 201);
  };

  login = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { email, password } = body as Record<string, string>;
    if (!email || !password) {
      return c.json({ error: "email and password are required." }, 400);
    }
    const { user, token } = await authService.login(email, password);
    return c.json({ user: user.toPublicJSON(), token });
  };

  me = async (c: Context<AppEnv>) => {
    const user = c.get("user")!;
    return c.json({ user: user.toPublicJSON() });
  };

  updateProfile = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { name, email, profession } = body;
    const updated = await authService.updateProfile(user.id, {
      name: name as string | undefined,
      email: email as string | undefined,
      profession: profession as string | null | undefined,
    });
    return c.json({ user: updated.toPublicJSON() });
  };

  changePassword = async (c: Context<AppEnv>) => {
    const { authService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return c.json({ error: "currentPassword and newPassword are required." }, 400);
    }
    await authService.changePassword(user.id, currentPassword as string, newPassword as string);
    return c.json({ success: true });
  };
}
