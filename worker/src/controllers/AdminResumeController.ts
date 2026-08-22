import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { Resume } from "../models/Resume";
import { toCsv } from "../utils/csv";

/**
 * Global, cross-user resume search for the admin console. Previously the
 * only way to find a specific resume was opening the right user first on
 * the Users page and expanding their row — no good for a support ticket
 * like "my public link is broken" where you only have a title or slug.
 */
export class AdminResumeController {
  /** One resume plus its owner's name/email, for the admin resume editor (support cases — see client's AdminResumeEditPage). */
  get = async (c: Context<AppEnv>) => {
    const { resumeRepository, userRepository } = c.get("services");
    const id = c.req.param("id")!;
    const record = await resumeRepository.findById(id);
    if (!record) return c.json({ error: "Resume not found." }, 404);
    const owner = await userRepository.findById(record.userId);
    return c.json({
      resume: new Resume(record).toJSON(),
      ownerName: owner?.name ?? "(deleted user)",
      ownerEmail: owner?.email ?? "",
    });
  };

  /**
   * Full content edit for a support case — reuses ResumeService.update
   * (the same method the resume's own owner's Edit Resume page calls)
   * rather than writing straight to the repository, so an admin edit still
   * goes through every existing rule: tier-gated templates/visibility,
   * version-history snapshotting, and summary/bullets regeneration when
   * answers or achievements change. The owner's own subscription tier still
   * governs what's allowed here (e.g. a Starter user's resume still can't
   * take a Premium template) — if that needs to change, bump their tier
   * from the Users page first.
   */
  update = async (c: Context<AppEnv>) => {
    const { resumeRepository, resumeService, adminAuditLogRepository } = c.get("services");
    const id = c.req.param("id")!;
    const existing = await resumeRepository.findById(id);
    if (!existing) return c.json({ error: "Resume not found." }, 404);
    const input = await c.req.json().catch(() => ({}));

    const updated = await resumeService.update(existing.userId, id, input);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "resume.update",
      targetType: "resume",
      targetId: id,
      detail: `Edited "${existing.title}"`,
    });
    return c.json({ resume: updated.toJSON() });
  };

  search = async (c: Context<AppEnv>) => {
    const { resumeRepository } = c.get("services");
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 25;
    const q = c.req.query("q") ?? undefined;

    const { resumes: records, total } = await resumeRepository.searchAllWithOwner({ page, pageSize, q });
    const resumes = records.map(({ ownerName, ownerEmail, ...record }) => ({
      ...new Resume(record).toJSON(),
      ownerName,
      ownerEmail,
    }));
    return c.json({ resumes, total, page, pageSize });
  };

  /** Exports every resume matching the current search as CSV — the full filtered result set, not just the page on screen. */
  exportCsv = async (c: Context<AppEnv>) => {
    const { resumeRepository, adminAuditLogRepository } = c.get("services");
    const q = c.req.query("q") ?? undefined;
    const records = await resumeRepository.searchAllWithOwnerUnpaged({ q });

    const rows = records.map(({ ownerName, ownerEmail, ...record }) => {
      const resume = new Resume(record).toJSON();
      return {
        id: resume.id,
        title: resume.title,
        slug: resume.slug,
        ownerName,
        ownerEmail,
        templateKey: resume.templateKey,
        visibility: resume.visibility,
        active: resume.active,
        viewCount: resume.viewCount,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      };
    });
    const csv = toCsv(rows, [
      { key: "id", header: "ID" },
      { key: "title", header: "Title" },
      { key: "slug", header: "Slug" },
      { key: "ownerName", header: "Owner Name" },
      { key: "ownerEmail", header: "Owner Email" },
      { key: "templateKey", header: "Template" },
      { key: "visibility", header: "Visibility" },
      { key: "active", header: "Active" },
      { key: "viewCount", header: "Views" },
      { key: "createdAt", header: "Created" },
      { key: "updatedAt", header: "Updated" },
    ]);

    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "resume.export_csv",
      targetType: "resume",
      detail: `Exported ${rows.length} resume${rows.length === 1 ? "" : "s"}${q ? ` matching "${q}"` : ""}`,
    });

    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename="resumes-${new Date().toISOString().slice(0, 10)}.csv"`);
    return c.body(csv);
  };

  /** Bulk delete for the admin Resumes page's multi-select action bar — same per-resume child-table cascade as a single delete, batched. */
  bulkDelete = async (c: Context<AppEnv>) => {
    const { resumeRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
    if (ids.length === 0) return c.json({ error: "No resumes selected." }, 400);

    await resumeRepository.deleteBulk(ids);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "resume.bulk_delete",
      targetType: "resume",
      detail: `${ids.length} resume${ids.length === 1 ? "" : "s"}`,
    });
    return c.json({ success: true, count: ids.length });
  };
}
