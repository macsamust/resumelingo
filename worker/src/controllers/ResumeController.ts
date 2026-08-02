import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { LinkVisibility } from "../types";

export class ResumeController {
  list = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const resumes = await resumeService.listForUser(user.id);
    return c.json({ resumes: resumes.map((r) => r.toJSON()) });
  };

  get = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const resume = await resumeService.getOwned(user.id, c.req.param("id"));
    return c.json({ resume: resume.toJSON() });
  };

  create = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const { title, profession, templateKey, visibility, accessPassword, answers } = body as Record<string, unknown>;
    if (!title || !profession || !templateKey || !answers) {
      return c.json({ error: "title, profession, templateKey, and answers are required." }, 400);
    }
    const resume = await resumeService.create(user, {
      title: title as string,
      profession: profession as string,
      templateKey: templateKey as string,
      visibility: visibility as LinkVisibility | undefined,
      accessPassword: accessPassword as string | null | undefined,
      answers: answers as Record<string, string>,
    });
    return c.json({ resume: resume.toJSON() }, 201);
  };

  update = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const resume = await resumeService.update(user.id, c.req.param("id"), body);
    return c.json({ resume: resume.toJSON() });
  };

  remove = async (c: Context<AppEnv>) => {
    const { resumeService } = c.get("services");
    const user = c.get("user")!;
    await resumeService.delete(user.id, c.req.param("id"));
    return c.body(null, 204);
  };
}
