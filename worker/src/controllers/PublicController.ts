import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

export class PublicController {
  getBySlug = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const password = c.req.query("password");
    const resume = await resumeService.getPublicBySlug(c.req.param("slug"), password);
    return c.json({ resume: resume.toPublicJSON() });
  };
}
