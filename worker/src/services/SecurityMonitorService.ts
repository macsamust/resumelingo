import { AdminAuditLogRepository } from "../repositories/AdminAuditLogRepository";
import { AdminRepository } from "../repositories/AdminRepository";
import { SecurityEventRepository } from "../repositories/SecurityEventRepository";
import { EmailService } from "./EmailService";

/** Delete-type admin_audit_log actions counted toward the mass-delete check below — see AdminAuditLogPage.tsx's ACTION_LABELS for the full action vocabulary. */
const DELETE_ACTIONS = ["user.delete", "user.bulk_delete", "resume.delete", "resume.bulk_delete", "template.delete", "admin.delete"];
/** More than this many delete-type actions by one admin in 24h gets flagged — a real bulk cleanup an admin means to do is still rare enough that this is worth a look, not a false-positive trap. */
const MASS_DELETE_THRESHOLD = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface SecurityMonitorRunSummary {
  massDeleteFlags: number;
  digestEventCount: number;
  digestSent: boolean;
}

/**
 * The app's second scheduled job (see ViewDigestService for the first),
 * invoked daily from index.ts's `scheduled` export. Two jobs in one run:
 *
 * 1. Scans the last 24h of the durable, never-pruned admin_audit_log for a
 *    mass-delete anomaly per admin — this is the one signal in the Sep 2026
 *    security-anomaly scope that's genuinely safe to check *retrospectively*
 *    once a day, since admin_audit_log is never pruned (unlike the
 *    short-lived IP-throttle tables everything else here reads from
 *    real-time via SecurityAlertService, which can't wait for a daily scan
 *    without losing the data — see that class's doc comment).
 * 2. Rolls the last 24h of security_events (written throughout the day by
 *    SecurityAlertService, plus anything this same run just flagged) into
 *    one daily digest email — critical events already fired their own
 *    immediate email when they happened; this is a recap plus everything at
 *    warning/info severity, so admins aren't pinged individually for every
 *    lower-severity signal.
 *
 * Known gap, stated plainly rather than hidden: this does not catch a
 * "slow-drip" bot that stays under each individual per-request throttle
 * threshold every single hour (e.g. registrations spread just far enough
 * apart to never trip email_verification_ip_log's own window) — doing that
 * would mean keeping those IP-throttle tables' rows around for a full 24h
 * instead of pruning them within their throttle window, which grows those
 * tables for no throttling benefit. Left as a known limitation rather than
 * built now.
 */
export class SecurityMonitorService {
  constructor(
    private readonly auditLog: AdminAuditLogRepository,
    private readonly admins: AdminRepository,
    private readonly events: SecurityEventRepository,
    private readonly email: EmailService,
    private readonly adminEmailFallback: string | undefined
  ) {}

  async runDailyCheck(): Promise<SecurityMonitorRunSummary> {
    const sinceIso = new Date(Date.now() - DAY_MS).toISOString();
    const massDeleteFlags = await this.checkMassDeletes(sinceIso);
    const { digestEventCount, digestSent } = await this.sendDigest(sinceIso);
    return { massDeleteFlags, digestEventCount, digestSent };
  }

  private async checkMassDeletes(sinceIso: string): Promise<number> {
    let flagged = 0;
    for (const action of DELETE_ACTIONS) {
      const entries = await this.auditLog.findAllMatching({ action, from: sinceIso, limit: 5000 });
      const byAdmin = new Map<string, { adminEmail: string; count: number }>();
      for (const entry of entries) {
        const current = byAdmin.get(entry.adminId) ?? { adminEmail: entry.adminEmail, count: 0 };
        current.count++;
        byAdmin.set(entry.adminId, current);
      }
      for (const [adminId, info] of byAdmin) {
        if (info.count < MASS_DELETE_THRESHOLD) continue;
        const alreadyLogged = await this.events.existsAdminMassDeleteSince(adminId, sinceIso);
        if (alreadyLogged) continue;
        await this.events.log({
          type: "admin_mass_delete",
          severity: "warning",
          ip: null,
          detail: JSON.stringify({ adminId, adminEmail: info.adminEmail, action, count: info.count }),
        });
        flagged++;
      }
    }
    return flagged;
  }

  private async sendDigest(sinceIso: string): Promise<{ digestEventCount: number; digestSent: boolean }> {
    const recent = await this.events.findSince(sinceIso);
    if (recent.length === 0) return { digestEventCount: 0, digestSent: false };

    const countsByKey = new Map<string, { type: string; severity: string; count: number }>();
    for (const e of recent) {
      const key = `${e.type}:${e.severity}`;
      const current = countsByKey.get(key) ?? { type: e.type, severity: e.severity, count: 0 };
      current.count++;
      countsByKey.set(key, current);
    }
    const counts = [...countsByKey.values()];

    const adminRows = await this.admins.findAll();
    const recipients = adminRows.length > 0 ? adminRows.map((a) => a.email) : this.adminEmailFallback ? [this.adminEmailFallback] : [];
    for (const to of recipients) {
      try {
        await this.email.sendSecurityDailyDigestEmail(to, counts);
      } catch (err) {
        console.error("Security daily digest send failed for", to, err);
      }
    }
    return { digestEventCount: recent.length, digestSent: recipients.length > 0 };
  }
}
