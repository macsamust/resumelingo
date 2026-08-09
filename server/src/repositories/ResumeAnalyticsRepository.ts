import { nanoid } from "nanoid";
import { pool } from "../db/database";

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
 * Backs the Premium dashboard's "Resume Analytics" section (view trend +
 * strength-score trend). Deliberately a separate repository from
 * ResumeRepository rather than more methods bolted onto it — these two
 * tables (resume_views, resume_score_snapshots) are pure event logs with no
 * corresponding domain model, unlike ResumeRecord.
 */
export class ResumeAnalyticsRepository {
  private readonly pool = pool;

  /** Logs one public view — called alongside ResumeRepository.incrementViewCount, which stays the source for the always-visible view-count number (My Resumes cards, "Total Views" tile). This event log only feeds the Premium view-trend chart. */
  async recordView(resumeId: string): Promise<void> {
    await this.pool.query(`INSERT INTO resume_views ("id", "resumeId", "viewedAt") VALUES ($1, $2, $3)`, [
      nanoid(12),
      resumeId,
      new Date().toISOString(),
    ]);
  }

  /** Snapshots a resume's current Resume.strengthScore — called after every create/update in ResumeService, so a trend ("up 12 points this month") can be shown without recomputing the score for past states, which isn't possible since only the current resume row is stored. */
  async recordScoreSnapshot(resumeId: string, score: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO resume_score_snapshots ("id", "resumeId", "score", "recordedAt") VALUES ($1, $2, $3, $4)`,
      [nanoid(12), resumeId, score, new Date().toISOString()]
    );
  }

  /** Per-day view counts across the given resumes for the last `days` days (oldest first). Days with zero views are simply absent — callers fill the gaps. */
  async dailyViewCounts(resumeIds: string[], days = 14): Promise<DailyViewCount[]> {
    if (resumeIds.length === 0) return [];
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const { rows } = await this.pool.query(
      `SELECT to_char(date_trunc('day', "viewedAt"::timestamptz), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
       FROM resume_views
       WHERE "resumeId" = ANY($1) AND "viewedAt" >= $2
       GROUP BY date
       ORDER BY date`,
      [resumeIds, since.toISOString()]
    );
    return rows as DailyViewCount[];
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

    const { rows: newestRows } = await this.pool.query(
      `SELECT DISTINCT ON ("resumeId") "resumeId", "score"
       FROM resume_score_snapshots
       WHERE "resumeId" = ANY($1)
       ORDER BY "resumeId", "recordedAt" DESC`,
      [resumeIds]
    );
    const { rows: oldestRows } = await this.pool.query(
      `SELECT DISTINCT ON ("resumeId") "resumeId", "score"
       FROM resume_score_snapshots
       WHERE "resumeId" = ANY($1) AND "recordedAt" >= $2
       ORDER BY "resumeId", "recordedAt" ASC`,
      [resumeIds, since.toISOString()]
    );
    const oldestByResume = new Map<string, number>(oldestRows.map((r) => [r.resumeId as string, r.score as number]));
    return (newestRows as { resumeId: string; score: number }[]).map((r) => ({
      resumeId: r.resumeId,
      newest: r.score,
      oldest: oldestByResume.get(r.resumeId) ?? r.score,
    }));
  }

  /** Logs one ATS Check keyword match's missing-keyword list — see ResumeController.recordKeywordCheck. Caps the list itself is enforced by the caller, not here. */
  async recordKeywordCheck(resumeId: string, missingKeywords: string[]): Promise<void> {
    await this.pool.query(
      `INSERT INTO resume_keyword_checks ("id", "resumeId", "missingKeywords", "checkedAt") VALUES ($1, $2, $3, $4)`,
      [nanoid(12), resumeId, JSON.stringify(missingKeywords), new Date().toISOString()]
    );
  }

  /** Most frequently missing keywords across every logged check for the given resumes, most-common first — "keywords you keep missing" for the Premium dashboard. */
  async recurringMissingKeywords(resumeIds: string[], limit = 8): Promise<KeywordGapCount[]> {
    if (resumeIds.length === 0) return [];
    const { rows } = await this.pool.query(
      `SELECT keyword, COUNT(*)::int AS count
       FROM resume_keyword_checks, LATERAL jsonb_array_elements_text("missingKeywords"::jsonb) AS keyword
       WHERE "resumeId" = ANY($1)
       GROUP BY keyword
       ORDER BY count DESC, keyword ASC
       LIMIT $2`,
      [resumeIds, limit]
    );
    return (rows as { keyword: string; count: number }[]).map((r) => ({ word: r.keyword, count: r.count }));
  }
}
