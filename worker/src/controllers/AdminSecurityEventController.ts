import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/** "to" comes in as a plain date (YYYY-MM-DD) from a date input — advance it to the start of the next day so the filter includes that whole day. Same helper as AdminAuditLogController's. */
function toExclusiveEnd(toParam: string | undefined): string | undefined {
  return toParam ? new Date(new Date(toParam).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined;
}

/** Read-only list backing the Admin Console's Security Report page — see SecurityEventRepository/SecurityAlertService/SecurityMonitorService for how rows get written. */
export class AdminSecurityEventController {
  list = async (c: Context<AppEnv>) => {
    const { securityEventRepository } = c.get("services");
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 50;
    const type = c.req.query("type") || undefined;
    const severity = c.req.query("severity") || undefined;
    const from = c.req.query("from") || undefined;
    const to = toExclusiveEnd(c.req.query("to"));
    const { entries, total } = await securityEventRepository.findPage({ page, pageSize, type, severity, from, to });
    return c.json({ entries, total, page, pageSize });
  };
}
