import { ResumeRepository } from "../repositories/ResumeRepository";
import { SkillSuggestionRepository } from "../repositories/SkillSuggestionRepository";
import { EmailService } from "./EmailService";
import { TokenService } from "./TokenService";
import { UnsubscribeDigestTokenPayload } from "./ViewDigestService";
import { ResumeRecord, WorkExperienceEntry } from "../types";

/**
 * Signed, stateless — no DB storage needed, mirroring
 * UnsubscribeDigestTokenPayload (see ViewDigestService.ts). A short expiry
 * (30d, well under even the shortest 60-day cadence) keeps an old nudge
 * email from staying clickable indefinitely, since the landing page it
 * points to can mutate the resume (add a bullet). Genuine single-use
 * enforcement isn't needed on top of that: the landing page requires an
 * explicit click to act (see the anti-prefetch pattern in
 * AuthController.unsubscribeDigest/UnsubscribePage.tsx), and re-answering
 * "yes, still working there" or re-adding a bullet from the same link is a
 * user mistake to recover from, not a security concern.
 */
export interface ResumeRefreshNudgeTokenPayload {
  userId: string;
  resumeId: string;
  purpose: "resume-refresh-nudge";
}

/**
 * The job a resume's "Are you still working at {company} as {title}?"
 * question should ask about — the entry marked `current: true`, or (if
 * nobody's marked current, e.g. an older resume built before that field
 * existed) whichever entry has the latest startDate. Null when there's no
 * work experience at all, in which case the email falls back to asking
 * about the resume generically instead of a specific job — see
 * EmailService.sendResumeRefreshNudgeEmail. Exported and pulled out as a
 * pure function (like ViewDigestService's sumWeeklyViews) so it's covered
 * by a plain unit test without needing a D1 instance.
 */
export function currentJobFor(experienceJson: string): WorkExperienceEntry | null {
  let entries: WorkExperienceEntry[];
  try {
    entries = JSON.parse(experienceJson || "[]");
  } catch {
    return null;
  }
  if (entries.length === 0) return null;
  const current = entries.find((e) => e.current);
  if (current) return current;
  return [...entries].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
}

export interface NudgeRunSummary {
  eligibleResumes: number;
  usersNudged: number;
  resumesNudged: number;
  failed: number;
}

/**
 * The AI Resume Refresh nudge's daily cron job (see TODO.md's finalized
 * scope) — deliberately its own cron, separate from ViewDigestService's
 * weekly one, per the explicit product decision that these are "two fully
 * independent scheduled jobs." Walks every resume due for a nudge
 * (ResumeRepository.findEligibleForRefreshNudge already applies the
 * per-resume cadence check in SQL), groups them by account so a subscriber
 * with several stale resumes gets one combined email rather than one per
 * resume (the "combine" product decision), and stamps each resume's
 * lastRefreshNudgeSentAt only after its email actually sends. Each account
 * is handled independently, like ViewDigestService, so one failed send
 * doesn't stop the rest of the run.
 */
export class ResumeRefreshNudgeService {
  constructor(
    private readonly resumes: ResumeRepository,
    private readonly skillSuggestions: SkillSuggestionRepository,
    private readonly email: EmailService,
    private readonly nudgeTokens: TokenService<ResumeRefreshNudgeTokenPayload>,
    private readonly unsubscribeTokens: TokenService<UnsubscribeDigestTokenPayload>,
    private readonly clientOrigin: string
  ) {}

  private nudgeUrl(token: string): string {
    return `${this.clientOrigin.replace(/\/$/, "")}/resume-refresh?token=${token}`;
  }

  private unsubscribeUrl(token: string): string {
    return `${this.clientOrigin.replace(/\/$/, "")}/unsubscribe?token=${token}&type=refresh`;
  }

  /** Top few labels only — "a couple of keywords," not a dump of the entire catalog for that profession. Skills before tools, same ordering SkillSuggestionRepository.findByProfession already returns. */
  private async keywordsFor(profession: string): Promise<string[]> {
    const suggestions = await this.skillSuggestions.findByProfession(profession);
    return suggestions.slice(0, 5).map((s) => s.label);
  }

  async sendDailyNudges(): Promise<NudgeRunSummary> {
    const eligible = await this.resumes.findEligibleForRefreshNudge();
    const summary: NudgeRunSummary = { eligibleResumes: eligible.length, usersNudged: 0, resumesNudged: 0, failed: 0 };

    const byUser = new Map<string, { ownerEmail: string; resumes: ResumeRecord[] }>();
    for (const resume of eligible) {
      const group = byUser.get(resume.userId);
      if (group) {
        group.resumes.push(resume);
      } else {
        byUser.set(resume.userId, { ownerEmail: resume.ownerEmail, resumes: [resume] });
      }
    }

    for (const [userId, group] of byUser) {
      try {
        const items = await Promise.all(
          group.resumes.map(async (resume) => {
            const job = currentJobFor(resume.experience);
            const keywords = await this.keywordsFor(resume.profession);
            const token = await this.nudgeTokens.sign({ userId, resumeId: resume.id, purpose: "resume-refresh-nudge" });
            return {
              resumeTitle: resume.title,
              company: job?.company ?? null,
              jobTitle: job?.title ?? null,
              keywords,
              nudgeUrl: this.nudgeUrl(token),
            };
          })
        );
        const unsubToken = await this.unsubscribeTokens.sign({ userId, purpose: "unsubscribe-resume-refresh" });
        await this.email.sendResumeRefreshNudgeEmail(group.ownerEmail, { resumes: items, unsubscribeUrl: this.unsubscribeUrl(unsubToken) });

        const now = new Date().toISOString();
        for (const resume of group.resumes) {
          await this.resumes.setLastRefreshNudgeSentAt(resume.id, now);
        }
        summary.usersNudged++;
        summary.resumesNudged += group.resumes.length;
      } catch (err) {
        console.error("Resume refresh nudge send failed for user", userId, err);
        summary.failed++;
      }
    }
    return summary;
  }
}
