export interface EmailTemplateNoteRecord {
  templateKey: string;
  note: string;
  updatedAt: string;
  updatedByAdminEmail: string | null;
}

/**
 * Backs the Admin Console's Email Templates preview page (see
 * migrations/0050_email_template_notes.sql and EmailService.TEMPLATES) — a
 * free-text comment per template key ("this one needs a copy update"),
 * upserted rather than versioned. Not every template key necessarily has a
 * row; `findByKey`/`findAll` simply omit ones that have never been
 * commented on, and the controller treats a missing row as an empty note.
 */
export class EmailTemplateNoteRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<EmailTemplateNoteRecord[]> {
    const { results } = await this.db.prepare(`SELECT * FROM email_template_notes`).all<EmailTemplateNoteRecord>();
    return results;
  }

  async findByKey(templateKey: string): Promise<EmailTemplateNoteRecord | undefined> {
    const row = await this.db
      .prepare(`SELECT * FROM email_template_notes WHERE templateKey = ?`)
      .bind(templateKey)
      .first<EmailTemplateNoteRecord>();
    return row ?? undefined;
  }

  async upsert(templateKey: string, note: string, updatedByAdminEmail: string | null): Promise<EmailTemplateNoteRecord> {
    const updatedAt = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO email_template_notes (templateKey, note, updatedAt, updatedByAdminEmail)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(templateKey) DO UPDATE SET note = excluded.note, updatedAt = excluded.updatedAt, updatedByAdminEmail = excluded.updatedByAdminEmail`
      )
      .bind(templateKey, note, updatedAt, updatedByAdminEmail)
      .run();
    return { templateKey, note, updatedAt, updatedByAdminEmail };
  }
}
