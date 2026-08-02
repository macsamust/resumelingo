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
}
