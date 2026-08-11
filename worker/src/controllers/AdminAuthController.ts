import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

export class AdminAuthController {
  login = async (c: Context<AppEnv>) => {
    const { adminService } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { email, password } = body as Record<string, string>;
    if (!email || !password) {
      return c.json({ error: "email and password are required." }, 400);
    }
    const { admin, token } = await adminService.login(email, password);
    return c.json({ admin: admin.toPublicJSON(), token });
  };

  me = async (c: Context<AppEnv>) => {
    const admin = c.get("admin")!;
    return c.json({ admin: admin.toPublicJSON() });
  };
}
