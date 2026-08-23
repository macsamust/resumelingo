import { UserRepository } from "../repositories/UserRepository";
import { ResumeRepository } from "../repositories/ResumeRepository";
import { ResumeAnalyticsRepository, DailyViewCount } from "../repositories/ResumeAnalyticsRepository";
import { EmailService } from "./EmailService";
import { TokenService } from "./TokenService";

/** Signed, stateless — no DB storage needed for unsubscribe links, unlike password reset (which needs revocable, one-time tokens). A long expiry is fine since worst case an old link just re-confirms an opt-out that may already be set. */
export interface UnsubscribeDigestTokenPayload {
  userId: string;
  purpose: "unsubscribe-digest";
}

/** Sums a week of per-day view counts — pulled out as its own function so it's covered by a plain unit test without needing a D1 instance. */
export function sumWeeklyViews(daily: DailyViewCount[]): number {
  return daily.reduce((total, day) => total + day.count, 0);
}

export interface DigestRunSummary {
  eligible: number;
  sent: number;
  skippedNoViews: number;
  skippedNoResumes: number;
  failed: number;
}

/**
 * The app's first background job — invoked from index.ts's `scheduled`
 * export on a weekly Cron Trigger (see wrangler.jsonc's `triggers.crons`).
 * Walks every Professional/Premium subscriber who hasn't opted out
 * (UserRepository.findEligibleForDigest), sums their last 7 days of resume
 * views (reusing ResumeAnalyticsRepository.dailyViewCounts — the same
 * source the Premium dashboard's view-trend chart uses), and skips anyone
 * with nothing to report rather than sending an empty "0 views" email.
 * Each user is handled independently so one failed send (e.g. a bad email
 * address) doesn't stop the rest of the run.
 */
export class ViewDigestService {
  constructor(
    private readonly users: UserRepository,
    private readonly resumes: ResumeRepository,
    private readonly analytics: ResumeAnalyticsRepository,
    private readonly email: EmailService,
    private readonly unsubscribeTokens: TokenService<UnsubscribeDigestTokenPayload>,
    private readonly clientOrigin: string
  ) {}

  private unsubscribeUrl(token: string): string {
    return `${this.clientOrigin.replace(/\/$/, "")}/unsubscribe?token=${token}`;
  }

  async sendWeeklyDigests(): Promise<DigestRunSummary> {
    const eligibleUsers = await this.users.findEligibleForDigest();
    const summary: DigestRunSummary = { eligible: eligibleUsers.length, sent: 0, skippedNoViews: 0, skippedNoResumes: 0, failed: 0 };

    for (const userRecord of eligibleUsers) {
      try {
        const resumes = await this.resumes.findAllForUser(userRecord.id);
        if (resumes.length === 0) {
          summary.skippedNoResumes++;
          continue;
        }
        const resumeIds = resumes.map((r) => r.id);
        const daily = await this.analytics.dailyViewCounts(resumeIds, 7);
        const totalViews = sumWeeklyViews(daily);
        if (totalViews === 0) {
          summary.skippedNoViews++;
          continue;
        }
        const token = await this.unsubscribeTokens.sign({ userId: userRecord.id, purpose: "unsubscribe-digest" });
        await this.email.sendViewDigestEmail(userRecord.email, { totalViews, unsubscribeUrl: this.unsubscribeUrl(token) });
        summary.sent++;
      } catch (err) {
        console.error("Weekly digest send failed for user", userRecord.id, err);
        summary.failed++;
      }
    }
    return summary;
  }
}
