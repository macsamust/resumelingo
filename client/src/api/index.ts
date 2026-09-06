import { AuthApi } from "./AuthApi";
import { ResumeApi } from "./ResumeApi";
import { CatalogApi } from "./CatalogApi";
import { AdminApi } from "./AdminApi";
import { ThankYouLetterApi } from "./ThankYouLetterApi";
import { CoverLetterApi } from "./CoverLetterApi";
import { CareerCoachApi } from "./CareerCoachApi";
import { ResumeImportApi } from "./ResumeImportApi";
import { AchievementGenerateApi } from "./AchievementGenerateApi";
import { JobApplicationApi } from "./JobApplicationApi";
import { SkillSuggestionAiApi } from "./SkillSuggestionAiApi";

export const authApi = new AuthApi();
export const resumeApi = new ResumeApi();
export const catalogApi = new CatalogApi();
export const thankYouLetterApi = new ThankYouLetterApi();
export const coverLetterApi = new CoverLetterApi();
export const careerCoachApi = new CareerCoachApi();
export const resumeImportApi = new ResumeImportApi();
export const achievementGenerateApi = new AchievementGenerateApi();
export const jobApplicationApi = new JobApplicationApi();
export const skillSuggestionAiApi = new SkillSuggestionAiApi();
// Deliberately not included in setAuthToken below — the admin token lives
// under its own storage key and is set via AdminAuthContext instead, so a
// regular user login/logout never touches the admin session.
export const adminApi = new AdminApi();

/** Propagate a fresh/cleared token to every regular-user API client instance at once. */
export function setAuthToken(token: string | null) {
  authApi.setToken(token);
  resumeApi.setToken(token);
  catalogApi.setToken(token);
  thankYouLetterApi.setToken(token);
  coverLetterApi.setToken(token);
  careerCoachApi.setToken(token);
  resumeImportApi.setToken(token);
  achievementGenerateApi.setToken(token);
  jobApplicationApi.setToken(token);
  skillSuggestionAiApi.setToken(token);
}

export * from "./ApiClient";
export * from "./AuthApi";
export * from "./ResumeApi";
export * from "./CatalogApi";
export * from "./AdminApi";
export * from "./ThankYouLetterApi";
export * from "./CoverLetterApi";
export * from "./CareerCoachApi";
export * from "./ResumeImportApi";
export * from "./AchievementGenerateApi";
export * from "./JobApplicationApi";
export * from "./SkillSuggestionAiApi";
