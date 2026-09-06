import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { SecurityEventRecord, SecurityEventSeverity, SecurityEventType } from "../types";

/**
 * Durable, never-pruned log of flagged abuse/anomaly signals — see
 * migrations/0034_security_monitoring.sql's doc comment for why this is a
 * separate table from the short-lived IP-throttle tables. Written to by
 * SecurityAlertService (real-time, when an existing throttle trips) and
 * SecurityMonitorService (daily, for admin-audit-log-derived anomalies).
 * Backs the Admin Console's Security Report page.
 */
export class SecurityEventRepository extends BaseRepository<SecurityEventRecord> {
  protected readonly table = "security_events";

  async log(input: { type: SecurityEventType; severity: SecurityEventSeverity; ip?: string | null; detail?: string | null }): Promise<void> {
    await this.insertRow({
      id: nanoid(12),
      type: input.type,
      severity: input.severity,
      ip: input.ip ?? null,
      detail: input.detail ?? null,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Whether a `type` event for `ip` was already logged since `sinceIso` —
   * the dedupe guard SecurityAlertService.recordIfNew uses so a single
   * ongoing burst (an attacker who keeps hitting the same 429 wall for the
   * rest of the throttle window) writes one row and sends one alert, not one
   * per blocked request. `ip` is nullable in the type (e.g. admin_mass_delete
   * is keyed by admin, not IP) — callers pass null for those and this
   * compares on IS NULL instead of an ip match.
   */
  async existsSince(type: SecurityEventType, ip: string | null, sinceIso: string): Promise<boolean> {
    const row = ip
      ? await this.db
          .prepare(`SELECT 1 as found FROM security_events WHERE type = ? AND ip = ? AND "createdAt" >= ? LIMIT 1`)
          .bind(type, ip, sinceIso)
          .first<{ found: number }>()
      : await this.db
          .prepare(`SELECT 1 as found FROM security_events WHERE type = ? AND ip IS NULL AND "createdAt" >= ? LIMIT 1`)
          .bind(type, sinceIso)
          .first<{ found: number }>();
    return !!row;
  }

  /**
   * Whether an admin_mass_delete event for this specific admin was already
   * logged since `sinceIso` — admin_mass_delete has no `ip` (it's keyed by
   * admin, not network), so it can't use existsSince's ip-based dedupe.
   * Matches on a LIKE against the JSON `detail` blob rather than a real
   * column — acceptable here since this table has no per-admin column and
   * adding one for a single check isn't worth a migration; detail's JSON key
   * order is fixed by SecurityMonitorService's own JSON.stringify call.
   */
  async existsAdminMassDeleteSince(adminId: string, sinceIso: string): Promise<boolean> {
    const row = await this.db
      .prepare(`SELECT 1 as found FROM security_events WHERE type = 'admin_mass_delete' AND "createdAt" >= ? AND detail LIKE ? LIMIT 1`)
      .bind(sinceIso, `%"adminId":"${adminId}"%`)
      .first<{ found: number }>();
    return !!row;
  }

  /**
   * Most recent entries first, paginated and optionally filtered — see
   * AdminSecurityEventController.list. Same shape as
   * AdminAuditLogRepository.findPage. `to` is treated as inclusive of the
   * whole day (caller passes the start of the following day).
   */
  async findPage(params: {
    page: number;
    pageSize: number;
    type?: string;
    severity?: string;
    from?: string;
    to?: string;
  }): Promise<{ entries: SecurityEventRecord[]; total: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const bindings: unknown[] = [];
    if (params.type) {
      conditions.push(`"type" = ?`);
      bindings.push(params.type);
    }
    if (params.severity) {
      conditions.push(`"severity" = ?`);
      bindings.push(params.severity);
    }
    if (params.from) {
      conditions.push(`"createdAt" >= ?`);
      bindings.push(params.from);
    }
    if (params.to) {
      conditions.push(`"createdAt" < ?`);
      bindings.push(params.to);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRow = await this.db
      .prepare(`SELECT COUNT(*) as count FROM security_events ${where}`)
      .bind(...bindings)
      .first<{ count: number }>();
    const { results } = await this.db
      .prepare(`SELECT * FROM security_events ${where} ORDER BY "createdAt" DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, pageSize, offset)
      .all<SecurityEventRecord>();

    return { entries: results, total: countRow?.count ?? 0 };
  }

  /** Counts since `sinceIso`, grouped by severity — feeds the admin dashboard's security summary tile. Zero-filled for any severity with no events in range. */
  async countBySeverity(sinceIso: string): Promise<Record<SecurityEventSeverity, number>> {
    const { results } = await this.db
      .prepare(`SELECT severity, COUNT(*) as count FROM security_events WHERE "createdAt" >= ? GROUP BY severity`)
      .bind(sinceIso)
      .all<{ severity: SecurityEventSeverity; count: number }>();
    const counts: Record<SecurityEventSeverity, number> = { critical: 0, warning: 0, info: 0 };
    for (const row of results) counts[row.severity] = row.count;
    return counts;
  }

  /** Same bounded-window shape as countBySeverity, but `[fromIso, toIso)` instead of open-ended — feeds the admin dashboard's trend arrow on the Security tiles (comparing the current range against the equal-length one before it). */
  async countBySeverityBetween(fromIso: string, toIso: string): Promise<Record<SecurityEventSeverity, number>> {
    const { results } = await this.db
      .prepare(`SELECT severity, COUNT(*) as count FROM security_events WHERE "createdAt" >= ? AND "createdAt" < ? GROUP BY severity`)
      .bind(fromIso, toIso)
      .all<{ severity: SecurityEventSeverity; count: number }>();
    const counts: Record<SecurityEventSeverity, number> = { critical: 0, warning: 0, info: 0 };
    for (const row of results) counts[row.severity] = row.count;
    return counts;
  }

  /** Every event since `sinceIso`, oldest first — used by SecurityMonitorService to build the daily digest email. */
  async findSince(sinceIso: string): Promise<SecurityEventRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM security_events WHERE "createdAt" >= ? ORDER BY "createdAt" ASC`)
      .bind(sinceIso)
      .all<SecurityEventRecord>();
    return results;
  }
}
