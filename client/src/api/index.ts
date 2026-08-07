import { AuthApi } from "./AuthApi";
import { ResumeApi } from "./ResumeApi";
import { CatalogApi } from "./CatalogApi";
import { AdminApi } from "./AdminApi";

export const authApi = new AuthApi();
export const resumeApi = new ResumeApi();
export const catalogApi = new CatalogApi();
// Deliberately not included in setAuthToken below — the admin token lives
// under its own storage key and is set via AdminAuthContext instead, so a
// regular user login/logout never touches the admin session.
export const adminApi = new AdminApi();

/** Propagate a fresh/cleared token to every regular-user API client instance at once. */
export function setAuthToken(token: string | null) {
  authApi.setToken(token);
  resumeApi.setToken(token);
  catalogApi.setToken(token);
}

export * from "./ApiClient";
export * from "./AuthApi";
export * from "./ResumeApi";
export * from "./CatalogApi";
export * from "./AdminApi";
