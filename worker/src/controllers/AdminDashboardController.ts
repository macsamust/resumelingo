import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";

/** Only these windows are accepted for the dashboard's date-range picker — an arbitrary `days` value would still work fine query-wise, but this keeps the UI (and the cheap COUNT queries behind it) to a small, predictable set of options. */
const ALLOWED_RANGE_DAYS = [7, 30, 90];
const DEFAULT_RANGE_DAYS = 7;
/** How many recent admin_audit_log entries surface directly on the dashboard — a glance, not a replacement for the full Audit Log page. */
const RECENT_ACTIVITY_LIMIT = 5;

/**
 * Powers the admin console's landing page (previously /admin just
 * redirected straight to /admin/users with no aggregate view at all).
 * Grew significantly in Sep 2026 (revenue, security, engagement, recent
 * activity) after a "make data easy to collect, all in one place" request —
 * every figure here is still a small, cheap aggregate query (COUNT/GROUP BY,
 * nothing scans full tables into the Worker), so this stays fast regardless
 * of how many users/resumes exist. `rangeDays` (7/30/90, default 7) controls
 * every "in range" figure below (users/resumes/views/security) except
 * Application Tracker adoption, which is cumulative rather than a
 * per-window event, and MRR/revenue, which reflects the current subscriber
 * base right now rather than a historical window.
 *
 * Each range-scoped figure also carries its equal-length *previous* period
 * (e.g. `newInRangePrevious`, `security.previous`) so the client can render
 * a trend arrow — this period vs. the one just like it, not an all-time
 * comparison. Doubles the query count but every one of them is still a
 * cheap bounded-range COUNT/GROUP BY.
 */
export class AdminDashboardController {
  summary = async (c: Context<AppEnv>) => {
    const {
      userRepository,
      resumeRepository,
      planRepository,
      securityEventRepository,
      resumeAnalyticsRepository,
      jobApplicationRepository,
      adminAuditLogRepository,
    } = c.get("services");
    const requestedDays = Number(c.req.query("days"));
    const rangeDays = ALLOWED_RANGE_DAYS.includes(requestedDays) ? requestedDays : DEFAULT_RANGE_DAYS;
    const sinceDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    // The equal-length window immediately before the current one — e.g. for
    // "last 7 days" this is the 7 days before that, not "everything before
    // today." Powers the dashboard's trend arrows (this period vs. the one
    // just like it), not a running all-time comparison.
    const previousSinceDate = new Date(Date.now() - rangeDays * 2 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalUsers,
      newUsers,
      newUsersPrevious,
      suspendedUsers,
      usersByTier,
      paymentFailedCount,
      plans,
      totalResumes,
      newResumes,
      newResumesPrevious,
      severityCounts,
      severityCountsPrevious,
      viewsInRange,
      viewsInRangePrevious,
      topTemplates,
      jobTrackerAdoption,
      recentActivity,
    ] = await Promise.all([
      userRepository.countAll(),
      userRepository.countCreatedSince(sinceDate),
      userRepository.countCreatedBetween(previousSinceDate, sinceDate),
      userRepository.countSuspended(),
      userRepository.countByTier(),
      userRepository.countPaymentFailed(),
      planRepository.findAll(),
      resumeRepository.countAll(),
      resumeRepository.countCreatedSince(sinceDate),
      resumeRepository.countCreatedBetween(previousSinceDate, sinceDate),
      securityEventRepository.countBySeverity(sinceDate),
      securityEventRepository.countBySeverityBetween(previousSinceDate, sinceDate),
      resumeAnalyticsRepository.countViewsSince(sinceDate),
      resumeAnalyticsRepository.countViewsBetween(previousSinceDate, sinceDate),
      resumeRepository.countByTemplate(5),
      jobApplicationRepository.countDistinctUsersWithApplications(),
      adminAuditLogRepository.findAllMatching({ limit: RECENT_ACTIVITY_LIMIT }),
    ]);

    // MRR = each tier's current subscriber count x that plan's current
    // monthly price — a snapshot of "if nothing changes, what renews next
    // month," not a historical figure, so it isn't scoped to rangeDays.
    const priceByTier = new Map(plans.map((p) => [p.tier, p.priceMonthly]));
    const revenueByTier: Record<SubscriptionTier, number> = {
      [SubscriptionTier.Starter]: 0,
      [SubscriptionTier.Professional]: 0,
      [SubscriptionTier.Premium]: 0,
    };
    let mrr = 0;
    for (const tier of Object.values(SubscriptionTier)) {
      const revenue = (usersByTier[tier] ?? 0) * (priceByTier.get(tier) ?? 0);
      revenueByTier[tier] = revenue;
      mrr += revenue;
    }

    return c.json({
      rangeDays,
      users: { total: totalUsers, newInRange: newUsers, newInRangePrevious: newUsersPrevious, suspended: suspendedUsers, byTier: usersByTier },
      resumes: { total: totalResumes, newInRange: newResumes, newInRangePrevious: newResumesPrevious },
      revenue: { mrr, byTier: revenueByTier, paymentFailedCount },
      security: { ...severityCounts, previous: severityCountsPrevious },
      engagement: { viewsInRange, viewsInRangePrevious, topTemplates, jobTrackerAdoption },
      recentActivity,
    });
  };
}
