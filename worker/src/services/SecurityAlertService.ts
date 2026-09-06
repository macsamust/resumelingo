import { SecurityEventRepository } from "../repositories/SecurityEventRepository";
import { AdminRepository } from "../repositories/AdminRepository";
import { EmailService } from "./EmailService";
import { SecurityEventSeverity, SecurityEventType } from "../types";

/**
 * The single write path into security_events, used by every controller that
 * throttles an abuse-prone endpoint (login, register, verify, resend,
 * password-reset, public resume password) — see AuthController/
 * PublicController's 429 branches. Centralizing here (rather than each
 * controller calling SecurityEventRepository directly) is what keeps the
 * dedupe guard and "critical fires an email immediately" behavior
 * consistent across every call site.
 */
export class SecurityAlertService {
  constructor(
    private readonly events: SecurityEventRepository,
    private readonly admins: AdminRepository,
    private readonly email: EmailService,
    private readonly adminEmailFallback: string | undefined
  ) {}

  /**
   * Writes a security_events row only if one of the same `type`+`ip` hasn't
   * already been logged within `dedupeWindowMinutes` — without this, an
   * attacker who keeps hitting the same 429 wall for the rest of the
   * throttle window would generate one row (and, for critical severity, one
   * email) per blocked request instead of one per burst. `dedupeWindowMinutes`
   * should normally match the controller's own throttle window, so exactly
   * one event is logged per window per (type, ip).
   */
  async recordIfNew(input: {
    type: SecurityEventType;
    severity: SecurityEventSeverity;
    ip: string | null;
    detail?: Record<string, unknown> | null;
    dedupeWindowMinutes: number;
  }): Promise<void> {
    const since = new Date(Date.now() - input.dedupeWindowMinutes * 60000).toISOString();
    const alreadyLogged = await this.events.existsSince(input.type, input.ip, since);
    if (alreadyLogged) return;

    const detailJson = input.detail ? JSON.stringify(input.detail) : null;
    await this.events.log({ type: input.type, severity: input.severity, ip: input.ip, detail: detailJson });

    if (input.severity === "critical") {
      await this.alertAdmins(input.type, input.detail ?? null).catch((err) => {
        console.error("Security alert email failed to send", err);
      });
    }
  }

  /** Sent to every real admin account on file, falling back to env.ADMIN_EMAIL only if no admin rows exist yet (e.g. right after a fresh deploy, before AdminService.ensureBootstrapAdmin has run). */
  private async alertAdmins(type: SecurityEventType, detail: Record<string, unknown> | null): Promise<void> {
    const admins = await this.admins.findAll();
    const recipients = admins.length > 0 ? admins.map((a) => a.email) : this.adminEmailFallback ? [this.adminEmailFallback] : [];
    for (const to of recipients) {
      await this.email.sendSecurityAlertEmail(to, type, detail);
    }
  }
}
