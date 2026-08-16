import { nanoid } from "nanoid";

export interface DailyViewCount {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface ResumeScoreTrend {
  resumeId: string;
  /** Earliest strength-score snapshot within the lookback window. */
  oldest: number;
  /** Most recent strength-score snapshot, regardless of window. */
  newest: number;
}

export interface KeywordGapCount {
  word: string;
  count: number;
}

/**
 * D1 port of server/'s ResumeAnalyticsRepository (see
 * server/src/repositories/ResumeAnalyticsRepository.ts) — same two purposes
 * (log resume_views/resume_score_snapshots/resume_keyword_checks events,
 * then aggregate them for the Premium dashboard's Resume Analytics), but
 * translated off Postgres-only SQL:
 *   - `ANY($1)` array binding isn't supported by D1 — every resumeIds filter
 *     below builds its own `IN (?, ?, ...)` placeholder list and spreads the
 *     ids into `.bind()` instead.
 *   - `DISTINCT ON` (Postgres-only) becomes a `ROW_NUMBER() OVER (PARTITION
 *     BY ...)` window function wrapped in a subquery — D1's SQLite version
 *     supports window functions, just not DISTINCT ON.
 *   - `date_trunc('day', ...)` becomes `strftime('%Y-%m-%d', ...)`, which
 *     parses the same ISO-8601 "viewedAt" strings this app already stores
 *     everywhere else.
 *   - `jsonb_array_elements_text` (Postgres) becomes SQLite's `json_each()`
 *     table-valued function over the same JSON-serialized TEXT column.
 * Not a BaseRepository subclass, same as server/'s version — these three
 * tables are pure event logs with no corresponding domain model.
 */
export class ResumeAnalyticsRepository {
  constructor(private readonly db: D1Database) {}

  private placeholders(ids: string[]): string {
    return ids.map(() => "?").join(", ");
  }

  /** Logs one public view — called alongside ResumeRepository.incrementViewCount, which stays the source for the always-visible view-count number (My Resumes cards, "Total Views" tile). This event log only feeds the Premium view-trend chart. */
  async recordView(resumeId: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO resume_views ("id", "resumeId", "viewedAt") VALUES (?, ?, ?)`)
      .bind(nanoid(12), resumeId, new Date().toISOString())
      .run();
  }

  /** Snapshots a resume's current Resume.strengthScore — called after every create/update/clone in ResumeService, so a trend ("up 12 points this month") can be shown without recomputing the score for past states, which isn't possible since only the current resume row is stored. */
  async recordScoreSnapshot(resumeId: string, score: number): Promise<void> {
    await this.db
      .prepare(`INSERT INTO resume_score_snapshots ("id", "resumeId", "score", "recordedAt") VALUES (?, ?, ?, ?)`)
      .bind(nanoid(12), resumeId, score, new Date().toISOString())
      .run();
  }

  /** Per-day view counts across the given resumes for the last `days` days (oldest first). Days with zero views are simply absent — callers fill the gaps. */
  async dailyViewCounts(resumeIds: string[], days = 14): Promise<DailyViewCount[]> {
    if (resumeIds.length === 0) return [];
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const { results } = await this.db
      .prepare(
        `SELECT strftime('%Y-%m-%d', "viewedAt") AS date, COUNT(*) AS count
         FROM resume_views
         WHERE "resumeId" IN (${this.placeholders(resumeIds)}) AND "viewedAt" >= ?
         GROUP BY date
         ORDER BY date`
      )
      .bind(...resumeIds, since.toISOString())
      .all<DailyViewCount>();
    return results;
  }

  /**
   * Per-resume strength-score trend: the earliest snapshot within the last
   * `days` days paired with the most recent snapshot overall. A resume with
   * only one snapshot (created and never edited again) reports oldest ===
   * newest, i.e. no change — that's the correct "nothing to compare yet"
   * answer, not an error case.
   */
  async scoreTrend(resumeIds: string[], days = 30): Promise<ResumeScoreTrend[]> {
    if (resumeIds.length === 0) return [];
    const since = new Date();
    since.setDate(since.getDate() - days);
    const placeholders = this.placeholders(resumeIds);

    const { results: newestRows } = await this.db
      .prepare(
        `SELECT "resumeId", "score" FROM (
           SELECT "resumeId", "score",
                  ROW_NUMBER() OVER (PARTITION BY "resumeId" ORDER BY "recordedAt" DESC) AS rn
           FROM resume_score_snapshots
           WHERE "resumeId" IN (${placeholders})
         ) WHERE rn = 1`
      )
      .bind(...resumeIds)
      .all<{ resumeId: string; score: number }>();

    const { results: oldestRows } = await this.db
      .prepare(
        `SELECT "resumeId", "score" FROM (
           SELECT "resumeId", "score",
                  ROW_NUMBER() OVER (PARTITION BY "resumeId" ORDER BY "recordedAt" ASC) AS rn
           FROM resume_score_snapshots
           WHERE "resumeId" IN (${placeholders}) AND "recordedAt" >= ?
         ) WHERE rn = 1`
      )
      .bind(...resumeIds, since.toISOString())
      .all<{ resumeId: string; score: number }>();

    const oldestByResume = new Map(oldestRows.map((r) => [r.resumeId, r.score]));
    return newestRows.map((r) => ({
      resumeId: r.resumeId,
      newest: r.score,
      oldest: oldestByResume.get(r.resumeId) ?? r.score,
    }));
  }

  /** Logs one ATS Check keyword match's missing-keyword list — see ResumeController.recordKeywordCheck. Caps the list itself is enforced by the caller, not here. */
  async recordKeywordCheck(resumeId: string, missingKeywords: string[]): Promise<void> {
    await this.db
      .prepare(`INSERT INTO resume_keyword_checks ("id", "resumeId", "missingKeywords", "checkedAt") VALUES (?, ?, ?, ?)`)
      .bind(nanoid(12), resumeId, JSON.stringify(missingKeywords), new Date().toISOString())
      .run();
  }

  /** Most frequently missing keywords across every logged check for the given resumes, most-common first — "keywords you keep missing" for the Premium dashboard. */
  async recurringMissingKeywords(resumeIds: string[], limit = 8): Promise<KeywordGapCount[]> {
    if (resumeIds.length === 0) return [];
    const { results } = await this.db
      .prepare(
        `SELECT je.value AS keyword, COUNT(*) AS count
         FROM resume_keyword_checks, json_each(resume_keyword_checks."missingKeywords") AS je
         WHERE resume_keyword_checks."resumeId" IN (${this.placeholders(resumeIds)})
         GROUP BY je.value
         ORDER BY count DESC, je.value ASC
         LIMIT ?`
      )
      .bind(...resumeIds, limit)
      .all<{ keyword: string; count: number }>();
    return results.map((r) => ({ word: r.keyword, count: r.count }));
  }
}
