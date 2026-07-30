import { AuthApi } from "./AuthApi";
import { ResumeApi } from "./ResumeApi";
import { CatalogApi } from "./CatalogApi";

export const authApi = new AuthApi();
export const resumeApi = new ResumeApi();
export const catalogApi = new CatalogApi();

/** Propagate a fresh/cleared token to every API client instance at once. */
export function setAuthToken(token: string | null) {
  authApi.setToken(token);
  resumeApi.setToken(token);
  catalogApi.setToken(token);
}

export * from "./ApiClient";
export * from "./AuthApi";
export * from "./ResumeApi";
export * from "./CatalogApi";
