import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/** Only these windows are accepted for the dashboard's date-range picker — an arbitrary `days` value would still work fine query-wise, but this keeps the UI (and the cheap COUNT queries behind it) to a small, predictable set of options. */
const ALLOWED_RANGE_DAYS = [7, 30, 90];
const DEFAULT_RANGE_DAYS = 7;

/**
 * Powers the admin console's landing page (previously /admin just
 * redirected straight to /admin/users with no aggregate view at all).
 * Every figure here is a small, cheap COUNT(*) query — nothing here scans
 * full tables into the Worker, so this stays fast regardless of how many
 * users/resumes exist. `rangeDays` (7/30/90, default 7) controls the
 * "new in the last N days" window on both tiles — previously hardcoded to
 * 7 days with no way to see a longer trend.
 */
export class AdminDashboardController {
  summary = async (c: Context<AppEnv>) => {
    const { userRepository, resumeRepository } = c.get("services");
    const requestedDays = Number(c.req.query("days"));
    const rangeDays = ALLOWED_RANGE_DAYS.includes(requestedDays) ? requestedDays : DEFAULT_RANGE_DAYS;
    const sinceDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    const [totalUsers, newUsers, suspendedUsers, usersByTier, totalResumes, newResumes] = await Promise.all([
      userRepository.countAll(),
      userRepository.countCreatedSince(sinceDate),
      userRepository.countSuspended(),
      userRepository.countByTier(),
      resumeRepository.countAll(),
      resumeRepository.countCreatedSince(sinceDate),
    ]);

    return c.json({
      rangeDays,
      users: { total: totalUsers, newInRange: newUsers, suspended: suspendedUsers, byTier: usersByTier },
      resumes: { total: totalResumes, newInRange: newResumes },
    });
  };
}
