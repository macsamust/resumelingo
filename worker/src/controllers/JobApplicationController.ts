import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { JobApplicationStatus } from "../types";
import { APPLICATIONS_WARNING_THRESHOLD, isStaleApplication, MAX_APPLICATIONS_PER_USER } from "../services/JobApplicationService";

/** CRUD for the job application tracker — see JobApplicationService, migrations/0015_job_applications.sql. Same shape as ResumeController. */
export class JobApplicationController {
  list = async (c: Context<AppEnv>) => {
    const { jobApplicationService } = c.get("services");
    const user = c.get("user")!;
    const applications = await jobApplicationService.listForUser(user.id);
    // limit/warningThreshold come from here (not hardcoded on the client)
    // so JobApplicationsPage.tsx's "approaching the limit" banner and the
    // service's actual cap can never drift apart. staleCount powers the
    // "Clean up old applications" banner — computed against the same list
    // just returned, so it's always consistent with what's on screen.
    const staleCount = applications.filter((a) => isStaleApplication(a)).length;
    return c.json({ applications, limit: MAX_APPLICATIONS_PER_USER, warningThreshold: APPLICATIONS_WARNING_THRESHOLD, staleCount });
  };

  /** POST /api/job-applications/cleanup-stale — deletes every application of this user's over 12 months old (see JobApplicationService.deleteStale). Only ever called from the client's "Clean up old applications" banner after an explicit confirm. */
  cleanupStale = async (c: Context<AppEnv>) => {
    const { jobApplicationService } = c.get("services");
    const user = c.get("user")!;
    const deletedCount = await jobApplicationService.deleteStale(user.id);
    return c.json({ deletedCount });
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
