import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { JobApplicationStatus } from "../types";

/** CRUD for the job application tracker — see JobApplicationService, migrations/0015_job_applications.sql. Same shape as ResumeController. */
export class JobApplicationController {
  list = async (c: Context<AppEnv>) => {
    const { jobApplicationService } = c.get("services");
    const user = c.get("user")!;
    const applications = await jobApplicationService.listForUser(user.id);
    return c.json({ applications });
  };

  create = async (c: Context<AppEnv>) => {
    const { jobApplicationService } = c.get("services");
    const user = c.get("user")!;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { resumeId, company, role, status, appliedDate, link, notes } = body;
    if (typeof company !== "string" || !company.trim() || typeof role !== "string" || !role.trim()) {
      return c.json({ error: "Company and role are required." }, 400);
    }
    const application = await jobApplicationService.create(user.id, {
      resumeId: typeof resumeId === "string" ? resumeId : null,
      company: company.trim(),
      role: role.trim(),
      status: typeof status === "string" ? (status as JobApplicationStatus) : undefined,
      appliedDate: typeof appliedDate === "string" ? appliedDate : null,
      link: typeof link === "string" ? link.trim() : undefined,
      notes: typeof notes === "string" ? notes : undefined,
    });
    return c.json({ application }, 201);
  };

  update = async (c: Context<AppEnv>) => {
    const { jobApplicationService } = c.get("services");
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const application = await jobApplicationService.update(user.id, c.req.param("id")!, body);
    return c.json({ application });
  };

  remove = async (c: Context<AppEnv>) => {
    const { jobApplicationService } = c.get("services");
    const user = c.get("user")!;
    await jobApplicationService.delete(user.id, c.req.param("id")!);
    return c.body(null, 204);
  };
}
