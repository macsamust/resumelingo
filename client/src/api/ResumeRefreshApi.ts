import { ApiClient } from "./ApiClient";
import { AchievementEntry } from "../types";

export interface ResumeRefreshPreview {
  resumeTitle: string;
  professionLabel: string;
  company: string | null;
  jobTitle: string | null;
  keywords: string[];
  /** Subset of `keywords` that already show up in a bullet or achievement already on this resume — the picker disables these rather than letting them draft a near-duplicate bullet again. See worker's ResumeRefreshController.usedKeywords. */
  usedKeywords: string[];
}

/** One reviewed (and possibly hand-edited) draft the person is about to add — the shared shape used by both the keyword-picker and CAR-form paths once they reach the review step. */
export interface ResumeRefreshDraftItem {
  achievement: AchievementEntry;
  bulletText: string;
}

/**
 * Backs the AI Resume Refresh nudge's no-login landing page
 * (ResumeRefreshPage.tsx) — every call here is gated by the signed token
 * from the nudge email, not a logged-in session, so this deliberately never
 * gets a bearer token attached (same reasoning as MarketingEventApi — see
 * api/index.ts's setAuthToken, which skips both).
 */
export class ResumeRefreshApi extends ApiClient {
  preview(token: string) {
    return this.get<ResumeRefreshPreview>(`/resume-refresh/preview?token=${encodeURIComponent(token)}`);
  }

  /** `keywords` — one or more selected keyword chips, turned into one draft bullet each. */
  previewKeywordBullet(token: string, keywords: string[]) {
    return this.post<{ achievements: AchievementEntry[] }>("/resume-refresh/preview-keyword-bullet", { token, keywords });
  }

  previewCarBullet(token: string, input: { challenge: string; action: string; result: string }) {
    return this.post<{ achievement: AchievementEntry; bulletText: string }>("/resume-refresh/preview-car-bullet", {
      token,
      ...input,
    });
  }

  commit(token: string, items: ResumeRefreshDraftItem[]) {
    return this.post<{ success: true; added: number; skippedDuplicates: number }>("/resume-refresh/commit", { token, items });
  }
}
