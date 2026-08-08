import { ApiClient } from "./ApiClient";
import { AdminAuthUser, AdminPlan, AdminTemplate, AdminUserSummary, Resume, TemplateCategory } from "../types";

export interface AdminAuthResponse {
  admin: AdminAuthUser;
  token: string;
}

/** Admin-only API surface — every call sends the separate admin token (see ApiClient's storageKey), never the regular user token. */
export class AdminApi extends ApiClient {
  constructor() {
    super(undefined, "websume_admin_token");
  }

  login(input: { email: string; password: string }) {
    return this.post<AdminAuthResponse>("/admin/auth/login", input);
  }

  me() {
    return this.get<{ admin: AdminAuthUser }>("/admin/auth/me");
  }

  listUsers() {
    return this.get<{ users: AdminUserSummary[] }>("/admin/users");
  }

  listUserResumes(userId: string) {
    return this.get<{ resumes: Resume[] }>(`/admin/users/${userId}/resumes`);
  }

  changeUserTier(userId: string, tier: string) {
    return this.put<{ user: unknown }>(`/admin/users/${userId}/tier`, { tier });
  }

  setUserSuspended(userId: string, suspended: boolean) {
    return this.put<{ success: true }>(`/admin/users/${userId}/suspend`, { suspended });
  }

  resetUserPassword(userId: string, newPassword: string) {
    return this.put<{ success: true }>(`/admin/users/${userId}/password`, { newPassword });
  }

  deleteUser(userId: string) {
    return this.del<{ success: true }>(`/admin/users/${userId}`);
  }

  listPlans() {
    return this.get<{ plans: AdminPlan[] }>("/admin/plans");
  }

  updatePlan(tier: string, input: { name?: string; priceMonthly?: number; resumeLimit?: number; features?: string[] }) {
    return this.put<{ plan: AdminPlan }>(`/admin/plans/${tier}`, input);
  }

  listTemplates() {
    return this.get<{ templates: AdminTemplate[] }>("/admin/templates");
  }

  createTemplate(input: { key?: string; name: string; description?: string; category?: TemplateCategory; enabled?: boolean; sortOrder?: number }) {
    return this.post<{ template: AdminTemplate }>("/admin/templates", input);
  }

  updateTemplate(key: string, input: { name?: string; description?: string; category?: TemplateCategory; enabled?: boolean; sortOrder?: number }) {
    return this.put<{ template: AdminTemplate }>(`/admin/templates/${key}`, input);
  }

  deleteTemplate(key: string) {
    return this.del<{ success: true }>(`/admin/templates/${key}`);
  }
}
