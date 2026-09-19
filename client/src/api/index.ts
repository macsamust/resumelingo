import { AuthApi } from "./AuthApi";
import { ResumeApi } from "./ResumeApi";
import { CatalogApi } from "./CatalogApi";
import { AdminApi } from "./AdminApi";
import { ThankYouLetterApi } from "./ThankYouLetterApi";
import { CoverLetterApi } from "./CoverLetterApi";
import { MarketingEventApi } from "./MarketingEventApi";
import { CareerCoachApi } from "./CareerCoachApi";
import { ResumeImportApi } from "./ResumeImportApi";
import { AchievementGenerateApi } from "./AchievementGenerateApi";
import { JobApplicationApi } from "./JobApplicationApi";
import { SkillSuggestionAiApi } from "./SkillSuggestionAiApi";
import { ResumeRefreshApi } from "./ResumeRefreshApi";
import { CareerLoopApi } from "./CareerLoopApi";

export const authApi = new AuthApi();
export const resumeApi = new ResumeApi();
export const catalogApi = new CatalogApi();
export const thankYouLetterApi = new ThankYouLetterApi();
export const coverLetterApi = new CoverLetterApi();
// Unauthenticated by design (fires from the logged-out Pricing page too) —
// still runs in ApiClient's default cookie mode like everything else here,
// but that's harmless: the route behind it never reads the cookie.
export const marketingEventApi = new MarketingEventApi();
export const careerCoachApi = new CareerCoachApi();
export const resumeImportApi = new ResumeImportApi();
export const achievementGenerateApi = new AchievementGenerateApi();
export const jobApplicationApi = new JobApplicationApi();
export const skillSuggestionAiApi = new SkillSuggestionAiApi();
// Every call here is gated by the signed token in the nudge email, not a
// logged-in session (see ResumeRefreshApi's doc comment) — same "harmless
// unused cookie" note as marketingEventApi above.
export const resumeRefreshApi = new ResumeRefreshApi();
export const careerLoopApi = new CareerLoopApi();
// SEC-A01 (Sep 2026) deliberately doesn't touch AdminApi — it keeps its own
// bearer-token mechanism (own storage key, set via AdminAuthContext) rather
// than ApiClient's default cookie mode; see AdminApi's constructor
// (`useCookies: false`). Admin auth is a separate, later decision.
export const adminApi = new AdminApi();

export * from "./ApiClient";
export * from "./AuthApi";
export * from "./ResumeApi";
export * from "./CatalogApi";
export * from "./AdminApi";
export * from "./ThankYouLetterApi";
export * from "./CoverLetterApi";
export * from "./MarketingEventApi";
export * from "./CareerCoachApi";
export * from "./ResumeImportApi";
export * from "./AchievementGenerateApi";
export * from "./JobApplicationApi";
export * from "./SkillSuggestionAiApi";
export * from "./ResumeRefreshApi";
export * from "./CareerLoopApi";
