import { CareerLoopProgressRecord } from "../types";

/**
 * Backs the "Full Circle" post-publish coach — see
 * migrations/0045_full_circle_loop_progress.sql. Not a BaseRepository
 * subclass: that base class assumes an `id` primary key, but this table's
 * natural key is `resumeId` (one row per resume, not per event), so it gets
 * a small standalone class instead.
 */
export class CareerLoopProgressRepository {
  constructor(private readonly db: D1Database) {}

  async findByResumeId(resumeId: string): Promise<CareerLoopProgressRecord | undefined> {
    const row = await this.db
      .prepare(`SELECT * FROM career_loop_progress WHERE "resumeId" = ?`)
      .bind(resumeId)
      .first<CareerLoopProgressRecord>();
    return row ?? undefined;
  }

  /** Creates the row on first touch (e.g. right after publish) — no-op shape if a row already exists, since callers only ever want "make sure this resume has a loop row" here, not a reset. */
  async ensureRow(resumeId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO career_loop_progress ("resumeId", "userId", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?)
         ON CONFLICT("resumeId") DO NOTHING`
      )
      .bind(resumeId, userId, now, now)
      .run();
  }

  async markShared(resumeId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO career_loop_progress ("resumeId", "userId", "sharedAt", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT("resumeId") DO UPDATE SET
           "sharedAt" = COALESCE(career_loop_progress."sharedAt", excluded."sharedAt"),
           "updatedAt" = excluded."updatedAt"`
      )
      .bind(resumeId, userId, now, now, now)
      .run();
  }

  async markLettersUsed(resumeId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO career_loop_progress ("resumeId", "userId", "lettersAt", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT("resumeId") DO UPDATE SET
           "lettersAt" = COALESCE(career_loop_progress."lettersAt", excluded."lettersAt"),
           "updatedAt" = excluded."updatedAt"`
      )
      .bind(resumeId, userId, now, now, now)
      .run();
  }

  /** 7-day snooze per the build brief's "Resume your loop" chip — dismissedUntil, not a permanent hide, so the card is eligible to reappear afterward if the loop is still incomplete. */
  async dismiss(resumeId: string, userId: string, dismissedUntil: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO career_loop_progress ("resumeId", "userId", "dismissedAt", "dismissedUntil", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT("resumeId") DO UPDATE SET
           "dismissedAt" = excluded."dismissedAt",
           "dismissedUntil" = excluded."dismissedUntil",
           "updatedAt" = excluded."updatedAt"`
      )
      .bind(resumeId, userId, now, dismissedUntil, now, now)
      .run();
  }
}
