import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { toCsv } from "../utils/csv";

/** "to" comes in as a plain date (YYYY-MM-DD) from a date input — advance it to the start of the next day so the filter includes that whole day. */
function toExclusiveEnd(toParam: string | undefined): string | undefined {
  return toParam ? new Date(new Date(toParam).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined;
}

export class AdminAuditLogController {
  list = async (c: Context<AppEnv>) => {
    const { adminAuditLogRepository } = c.get("services");
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 50;
    const adminId = c.req.query("adminId") || undefined;
    const action = c.req.query("action") || undefined;
    const from = c.req.query("from") || undefined;
    const to = toExclusiveEnd(c.req.query("to"));
    const { entries, total } = await adminAuditLogRepository.findPage({ page, pageSize, adminId, action, from, to });
    return c.json({ entries, total, page, pageSize });
  };

  /** Exports every audit log entry matching the current filters as CSV — the full filtered result set, not just the page on screen. */
  exportCsv = async (c: Context<AppEnv>) => {
    const { adminAuditLogRepository } = c.get("services");
    const adminId = c.req.query("adminId") || undefined;
    const action = c.req.query("action") || undefined;
    const from = c.req.query("from") || undefined;
    const to = toExclusiveEnd(c.req.query("to"));
    const entries = await adminAuditLogRepository.findAllMatching({ adminId, action, from, to });

    const csv = toCsv(entries, [
      { key: "id", header: "ID" },
      { key: "createdAt", header: "When" },
      { key: "adminEmail", header: "Admin" },
      { key: "action", header: "Action" },
      { key: "targetType", header: "Target Type" },
      { key: "targetId", header: "Target ID" },
      { key: "detail", header: "Detail" },
    ]);

    // Deliberately not itself audit-logged — the audit log exporting itself
    // would recursively grow the very table it's reading, and this export
    // contains no new PII beyond what's already visible on the Audit Log
    // page (unlike the Users export, which surfaces Stripe IDs/billing
    // status not shown elsewhere).
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
    return c.body(csv);
  };

  /**
   * On-demand tamper check (see AdminAuditLogRepository.verifyChainIntegrity)
   * — walks the whole table recomputing hashes, so this is O(n) on table
   * size; fine for an admin-triggered "Verify integrity" button, not
   * something to call on every page load.
   */
  verifyIntegrity = async (c: Context<AppEnv>) => {
    const { adminAuditLogRepository } = c.get("services");
    const result = await adminAuditLogRepository.verifyChainIntegrity();
    return c.json(result);
  };
}
