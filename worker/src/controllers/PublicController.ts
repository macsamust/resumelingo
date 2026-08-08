import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

export class PublicController {
  getBySlug = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const password = c.req.query("password");
    const user = c.get("user");
    const resume = await resumeService.getPublicBySlug(c.req.param("slug"), password, user?.id);
    return c.json({ resume: resume.toPublicJSON() });
  };
}
