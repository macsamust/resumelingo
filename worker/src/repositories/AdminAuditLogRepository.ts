import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { AdminAuditLogRecord } from "../types";
import { Admin } from "../models/Admin";

export class AdminAuditLogRepository extends BaseRepository<AdminAuditLogRecord> {
  protected readonly table = "admin_audit_log";

  /**
   * Records one sensitive admin action. Called directly from a controller
   * right after the action it's describing succeeds — see
   * AdminUserController/AdminTemplateController/AdminPlanController — so a
   * failed action (e.g. "user not found") never gets logged as if it happened.
   */
  async log(admin: Admin, input: { action: string; targetType: string; targetId?: string | null; detail?: string | null }): Promise<void> {
    const record: AdminAuditLogRecord = {
      id: nanoid(12),
      adminId: admin.id,
      adminEmail: admin.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      detail: input.detail ?? null,
      createdAt: new Date().toISOString(),
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
  }

  /**
   * The single most recent logged occurrence of `action` against `targetId`,
   * if any — used to enforce a cooldown on actions that shouldn't be spammed
   * (e.g. AdminUserController.sendPasswordReset), reusing the audit log
   * itself rather than a dedicated rate-limit table.
   */
  async findMostRecent(action: string, targetId: string): Promise<AdminAuditLogRecord | undefined> {
    const row = await this.db
      .prepare(`SELECT * FROM admin_audit_log WHERE action = ? AND "targetId" = ? ORDER BY "createdAt" DESC LIMIT 1`)
      .bind(action, targetId)
      .first<AdminAuditLogRecord>();
    return row ?? undefined;
  }

  /**
   * Every entry matching the same filters as findPage, unpaginated (up to
   * `limit`) — backs the Audit Log CSV export. Capped at 5,000 rows for the
   * same reason as UserRepository/ResumeRepository's equivalents.
   */
  async findAllMatching(params: { adminId?: string; action?: string; from?: string; to?: string; limit?: number }): Promise<AdminAuditLogRecord[]> {
    const conditions: string[] = [];
    const bindings: unknown[] = [];
    if (params.adminId) {
      conditions.push(`"adminId" = ?`);
      bindings.push(params.adminId);
    }
    if (params.action) {
      conditions.push(`"action" = ?`);
      bindings.push(params.action);
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
    const limit = Math.min(5000, Math.max(1, params.limit ?? 5000));

    const { results } = await this.db
      .prepare(`SELECT * FROM admin_audit_log ${where} ORDER BY "createdAt" DESC LIMIT ?`)
      .bind(...bindings, limit)
      .all<AdminAuditLogRecord>();
    return results;
  }

  /**
   * Most recent entries first, paginated and optionally filtered — see
   * AdminAuditLogController.list. All filters are optional and AND together
   * (e.g. a specific admin's "user.delete" actions in March). `to` is
   * treated as inclusive of the whole day by comparing against the start of
   * the following day, since date inputs only carry a "YYYY-MM-DD" value
   * with no time component.
   */
  async findPage(params: {
    page: number;
    pageSize: number;
    adminId?: string;
    action?: string;
    from?: string;
    to?: string;
  }): Promise<{ entries: AdminAuditLogRecord[]; total: number }> {
    const page = Math.max(1, params.page);
    const pageSize = Math.min(200, Math.max(1, params.pageSize));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const bindings: unknown[] = [];
    if (params.adminId) {
      conditions.push(`"adminId" = ?`);
      bindings.push(params.adminId);
    }
    if (params.action) {
      conditions.push(`"action" = ?`);
      bindings.push(params.action);
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
      .prepare(`SELECT COUNT(*) as count FROM admin_audit_log ${where}`)
      .bind(...bindings)
      .first<{ count: number }>();
    const { results } = await this.db
      .prepare(`SELECT * FROM admin_audit_log ${where} ORDER BY "createdAt" DESC LIMIT ? OFFSET ?`)
      .bind(...bindings, pageSize, offset)
      .all<AdminAuditLogRecord>();

    return { entries: results, total: countRow?.count ?? 0 };
  }
}
