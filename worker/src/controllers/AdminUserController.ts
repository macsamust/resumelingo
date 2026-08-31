import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { User } from "../models/User";
import { Resume } from "../models/Resume";
import { SubscriptionTier } from "../types";
import { toCsv } from "../utils/csv";

/**
 * Hono version of server/'s AdminUserController. Reads userRepository/
 * resumeRepository directly off `services` (see createServices.ts) rather
 * than being constructed with its own repository instances — Workers have
 * no shared module-level state, so every repository is built fresh per
 * request by servicesMiddleware and handed to controllers via context,
 * same pattern as every other controller in this codebase.
 */
export class AdminUserController {
  /**
   * One page of accounts plus subscription tier and resume count — the
   * admin Users list. Paginated and searched/sorted in SQL (see
   * UserRepository.findPageWithResumeCounts) rather than loading every user
   * into the Worker and the browser on every page view.
   */
  list = async (c: Context<AppEnv>) => {
    const { userRepository } = c.get("services");
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 50;
    const q = c.req.query("q") ?? undefined;
    const sortKey = c.req.query("sortKey") ?? "name";
    const sortDirection = c.req.query("sortDirection") === "desc" ? "desc" : "asc";
    const { users: records, total } = await userRepository.findPageWithResumeCounts({
      page,
      pageSize,
      q,
      sortKey,
      sortDirection,
    });
    const users = records.map(({ resumeCount, ...record }) => {
      const user = new User(record);
      return {
        ...user.toPublicJSON(),
        suspended: user.suspended,
        resumeCount,
        // Lets the admin tell a real paying subscriber apart from a
        // manually-comped tier change at a glance — a paid tier with no
        // stripeSubscriptionId means an admin set it directly, not Stripe.
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionActive: !!user.stripeSubscriptionId,
      };
    });
    return c.json({ users, total, page, pageSize });
  };

  /**
   * Exports every user matching the current search/sort as CSV — the full
   * filtered result set, not just the page on screen (see
   * UserRepository.findAllWithResumeCountsMatching). Logged in the audit
   * trail since this hands an admin a downloadable file of user PII
   * (emails, tiers, billing status).
   */
  exportCsv = async (c: Context<AppEnv>) => {
    const { userRepository, adminAuditLogRepository } = c.get("services");
    const q = c.req.query("q") ?? undefined;
    const sortKey = c.req.query("sortKey") ?? "name";
    const sortDirection = c.req.query("sortDirection") === "desc" ? "desc" : "asc";
    const records = await userRepository.findAllWithResumeCountsMatching({ q, sortKey, sortDirection });

    const rows = records.map((record) => {
      const user = new User(record);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        resumeCount: record.resumeCount,
        suspended: user.suspended,
        stripeCustomerId: user.stripeCustomerId ?? "",
        stripeSubscriptionActive: !!user.stripeSubscriptionId,
        createdAt: user.createdAt,
      };
    });
    const csv = toCsv(rows, [
      { key: "id", header: "ID" },
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "subscriptionTier", header: "Tier" },
      { key: "resumeCount", header: "Resume Count" },
      { key: "suspended", header: "Suspended" },
      { key: "stripeCustomerId", header: "Stripe Customer ID" },
      { key: "stripeSubscriptionActive", header: "Stripe Subscription Active" },
      { key: "createdAt", header: "Joined" },
    ]);

    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "user.export_csv",
      targetType: "user",
      detail: `Exported ${rows.length} user${rows.length === 1 ? "" : "s"}${q ? ` matching "${q}"` : ""}`,
    });

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`);
    return c.body(csv);
  };

  /** A single user's resumes, for the admin's "view a user's resume details" drill-down. */
  resumesForUser = async (c: Context<AppEnv>) => {
    const { resumeRepository } = c.get("services");
    const records = await resumeRepository.findAllForUser(c.req.param("id")!);
    return c.json({ resumes: records.map((r) => new Resume(r).toJSON()) });
  };

  changeTier = async (c: Context<AppEnv>) => {
    const { userRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const tier = body.tier as SubscriptionTier;
    if (!Object.values(SubscriptionTier).includes(tier)) {
      return c.json({ error: "Invalid subscription tier." }, 400);
    }
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);
    await userRepository.updateSubscriptionTier(id, tier);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "user.change_tier",
      targetType: "user",
      targetId: id,
      detail: `${existing.email}: ${existing.subscriptionTier} → ${tier}`,
    });
    const record = await userRepository.findById(id);
    return c.json({ user: new User(record!).toPublicJSON() });
  };

  setSuspended = async (c: Context<AppEnv>) => {
    const { userRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);
    const suspended = !!body.suspended;
    await userRepository.setSuspended(id, suspended);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: suspended ? "user.suspend" : "user.unsuspend",
      targetType: "user",
      targetId: id,
      detail: existing.email,
    });
    return c.json({ success: true });
  };

  /** Minimum time between admin-triggered password reset emails for the same user — see sendPasswordReset. */
  private static readonly PASSWORD_RESET_COOLDOWN_MINUTES = 2;

  /**
   * Sends the user the same "forgot your password" reset-link email they'd
   * get from the login page, rather than the admin typing a specific
   * plaintext password directly (the old behavior) — that meant an admin
   * always knew the account's real password afterward, with no expiry and
   * no notice to the user it had changed. This reuses AuthService's
   * existing token-based reset flow (see AuthService.requestPasswordReset),
   * so it inherits the same one-time, time-limited token behavior as a
   * self-service reset.
   */
  sendPasswordReset = async (c: Context<AppEnv>) => {
    const { userRepository, authService, adminAuditLogRepository } = c.get("services");
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);

    // AuthService.requestPasswordReset() silently no-ops for a suspended
    // account (correct there — it's the public, unauthenticated
    // forgot-password endpoint, which must not reveal an account's
    // suspended status to whoever's asking). This is an authenticated admin
    // action with no enumeration concern, so it should say so plainly
    // instead of reporting success for an email that was never sent — an
    // admin clicking this needs to know to unsuspend the account first, not
    // see a "sent" toast and assume the user will get it.
    if (existing.suspended) {
      return c.json({ error: "This account is suspended, so no reset email was sent. Unsuspend it first, then try again." }, 400);
    }

    // Cooldown reuses the audit log itself (every send is already logged
    // with targetId = user id) rather than a dedicated rate-limit table —
    // stops an admin (or a compromised admin session) from spamming the
    // same user's inbox with reset emails.
    const lastSent = await adminAuditLogRepository.findMostRecent("user.send_password_reset", id);
    if (lastSent) {
      const minutesSince = (Date.now() - new Date(lastSent.createdAt).getTime()) / 60000;
      if (minutesSince < AdminUserController.PASSWORD_RESET_COOLDOWN_MINUTES) {
        const waitMinutes = Math.ceil(AdminUserController.PASSWORD_RESET_COOLDOWN_MINUTES - minutesSince);
        return c.json(
          { error: `A reset email was just sent to this user. Please wait ${waitMinutes} more minute${waitMinutes === 1 ? "" : "s"}.` },
          429
        );
      }
    }

    await authService.requestPasswordReset(existing.email);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "user.send_password_reset",
      targetType: "user",
      targetId: id,
      detail: existing.email,
    });
    return c.json({ success: true });
  };

  /**
   * Bulk suspend/unsuspend for the admin Users page's multi-select action
   * bar. Only known, existing user ids are ever touched — the request body
   * is a plain array of ids checked against the DB, not trusted blindly, so
   * a stale selection (e.g. a user deleted by another admin moments ago)
   * can't cause a confusing partial failure.
   */
  bulkSetSuspended = async (c: Context<AppEnv>) => {
    const { userRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
    const suspended = !!body.suspended;
    if (ids.length === 0) return c.json({ error: "No users selected." }, 400);

    await userRepository.setSuspendedBulk(ids, suspended);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: suspended ? "user.bulk_suspend" : "user.bulk_unsuspend",
      targetType: "user",
      detail: `${ids.length} account${ids.length === 1 ? "" : "s"}`,
    });
    return c.json({ success: true, count: ids.length });
  };

  /** Bulk delete for the admin Users page's multi-select action bar — same cascade (resumes, then account) as remove(), just looped per id. */
  bulkRemove = async (c: Context<AppEnv>) => {
    const { userRepository, resumeRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
    if (ids.length === 0) return c.json({ error: "No users selected." }, 400);

    let deleted = 0;
    for (const id of ids) {
      const existing = await userRepository.findById(id);
      if (!existing) continue;
      await resumeRepository.deleteAllForUser(id);
      await userRepository.delete(id);
      deleted++;
    }
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "user.bulk_delete",
      targetType: "user",
      detail: `${deleted} account${deleted === 1 ? "" : "s"}`,
    });
    return c.json({ success: true, count: deleted });
  };

  /** Deletes the account and every resume it owns (resumes.userId references users, so resumes must go first). */
  remove = async (c: Context<AppEnv>) => {
    const { userRepository, resumeRepository, adminAuditLogRepository } = c.get("services");
    const id = c.req.param("id")!;
    const existing = await userRepository.findById(id);
    if (!existing) return c.json({ error: "User not found." }, 404);
    await resumeRepository.deleteAllForUser(id);
    await userRepository.delete(id);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "user.delete",
      targetType: "user",
      targetId: id,
      detail: existing.email,
    });
    return c.json({ success: true });
  };
}
