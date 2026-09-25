import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { EmailService } from "../services/EmailService";

/**
 * Read-only preview of every email ResumeLingo sends, plus a free-text
 * comment per template (CJ, Sep 2026: wanted a way to see what each email
 * looks like and leave a note in case something needs a small tweak, rather
 * than digging through EmailService.ts). Deliberately preview-only, not an
 * editor — see EmailService.TEMPLATES's doc comment for why: these emails
 * carry real legal/security language (verification, suspension, security
 * alerts), and a "quick edit" surface risks someone breaking a `${variable}`
 * interpolation in production. If inline editing is ever wanted, it needs
 * its own design (templates in D1, a safe editable-fields subset, etc.), not
 * a bolt-on to this page.
 */
export class AdminEmailTemplateController {
  list = async (c: Context<AppEnv>) => {
    const { emailTemplateNoteRepository } = c.get("services");
    const notes = await emailTemplateNoteRepository.findAll();
    const notesByKey = new Map(notes.map((n) => [n.templateKey, n]));
    const templates = EmailService.TEMPLATES.map((t) => {
      const existing = notesByKey.get(t.key);
      return {
        ...t,
        note: existing?.note ?? "",
        noteUpdatedAt: existing?.updatedAt ?? null,
        noteUpdatedByAdminEmail: existing?.updatedByAdminEmail ?? null,
      };
    });
    return c.json({ templates });
  };

  preview = async (c: Context<AppEnv>) => {
    const { emailService } = c.get("services");
    const key = c.req.param("key")!;
    const rendered = emailService.renderPreview(key);
    if (!rendered) return c.json({ error: "Unknown email template." }, 404);
    return c.json(rendered);
  };

  saveNote = async (c: Context<AppEnv>) => {
    const key = c.req.param("key")!;
    if (!EmailService.TEMPLATES.some((t) => t.key === key)) {
      return c.json({ error: "Unknown email template." }, 404);
    }
    const { emailTemplateNoteRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const note = typeof body.note === "string" ? body.note : "";
    const admin = c.get("admin");
    const updated = await emailTemplateNoteRepository.upsert(key, note, admin?.email ?? null);
    return c.json({ note: updated });
  };
}
