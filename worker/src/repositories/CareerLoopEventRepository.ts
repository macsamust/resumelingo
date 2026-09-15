import { nanoid } from "nanoid";

export type CareerLoopEventType = "shown" | "cta_click" | "step_done" | "completed";
export type CareerLoopEventStep = "share" | "track" | "letters";

/**
 * Backs the "Full Circle" coach's usage log — see
 * migrations/0046_career_loop_events.sql. Purely additive (no updates, no
 * reads feeding the coach itself) — this exists only so someone can later
 * ask "is this feature being used" via a raw query, not to drive any
 * runtime behavior. Logging failures are always swallowed by the caller
 * (CareerLoopService) rather than surfaced, since a missed analytics row
 * should never break the actual feature.
 */
export class CareerLoopEventRepository {
  constructor(private readonly db: D1Database) {}

  async log(resumeId: string, userId: string, eventType: CareerLoopEventType, step?: CareerLoopEventStep): Promise<void> {
    await this.db
      .prepare(`INSERT INTO career_loop_events ("id", "resumeId", "userId", "eventType", "step", "createdAt") VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(nanoid(12), resumeId, userId, eventType, step ?? null, new Date().toISOString())
      .run();
  }
}
