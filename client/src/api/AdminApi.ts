import { ApiClient } from "./ApiClient";
import { CreateResumeInput } from "./ResumeApi";
import {
  AdminAccount,
  AdminAuditLogEntry,
  AdminAuthUser,
  AdminDashboardSummary,
  AdminPlan,
  AdminResumeSearchResult,
  AdminRoleDescription,
  AdminSkillSuggestion,
  AdminTemplate,
  AdminUserSummary,
  Resume,
  TemplateCategory,
} from "../types";

/**
 * Same shape a regular user's Edit Resume page sends, plus generatedSummary/
 * generatedBullets — fields ResumeService.update already accepts (it falls
 * back to regenerating them only when answers/achievements/profession/name/
 * title change, see ResumeService.ts), but that a regular user's own editor
 * never sends directly since they have no UI for hand-editing that text.
 * The admin editor does, for fixing/redacting content on a support case.
 */
export interface AdminResumeUpdateInput extends Partial<CreateResumeInput> {
  generatedSummary?: string;
  generatedBullets?: string[];
}

export interface AdminAuthResponse {
  admin: AdminAuthUser;
  token: string;
}

/** Admin-only API surface — every call sends the separate admin token (see ApiClient's storageKey), never the regular user token. */
export class AdminApi extends ApiClient {
  constructor() {
    super(undefined, "resumelingo_admin_token");
  }

  login(input: { email: string; password: string }) {
    return this.post<AdminAuthResponse>("/admin/auth/login", input);
  }

  me() {
    return this.get<{ admin: AdminAuthUser }>("/admin/auth/me");
  }

  dashboardSummary(days?: number) {
    const qs = days ? `?days=${days}` : "";
    return this.get<AdminDashboardSummary>(`/admin/dashboard/summary${qs}`);
  }

  /** Cross-user resume search — see worker's AdminResumeController.search. */
  searchResumes(params: { page: number; pageSize: number; q?: string }) {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.q ? { q: params.q } : {}),
    });
    return this.get<{ resumes: AdminResumeSearchResult[]; total: number; page: number; pageSize: number }>(`/admin/resumes?${qs}`);
  }

  /** Full filtered result set (not just the current page) as a CSV Blob. */
  exportResumesCsv(params: { q?: string }) {
    const qs = new URLSearchParams({ ...(params.q ? { q: params.q } : {}) });
    return this.getBlob(`/admin/resumes/export?${qs}`);
  }

  bulkDeleteResumes(ids: string[]) {
    return this.post<{ success: true; count: number }>("/admin/resumes/bulk-delete", { ids });
  }

  /** One resume plus its owner's name/email — for the admin resume editor (support cases). */
  getResume(id: string) {
    return this.get<{ resume: Resume; ownerName: string; ownerEmail: string }>(`/admin/resumes/${id}`);
  }

  /**
   * Full content edit, going through the same ResumeService.update the
   * resume's owner's own Edit Resume page calls — see worker's
   * AdminResumeController.update for why (tier gates, version history,
   * summary/bullets regeneration all still apply).
   */
  updateResume(id: string, input: AdminResumeUpdateInput) {
    return this.put<{ resume: Resume }>(`/admin/resumes/${id}`, input);
  }

  listAuditLog(params: { page: number; pageSize: number; adminId?: string; action?: string; from?: string; to?: string }) {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.adminId ? { adminId: params.adminId } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
    });
    return this.get<{ entries: AdminAuditLogEntry[]; total: number; page: number; pageSize: number }>(`/admin/audit-log?${qs}`);
  }

  /** Full filtered result set (not just the current page) as a CSV Blob — see utils/downloadBlob.ts for turning this into a download. */
  exportAuditLogCsv(params: { adminId?: string; action?: string; from?: string; to?: string }) {
    const qs = new URLSearchParams({
      ...(params.adminId ? { adminId: params.adminId } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
    });
    return this.getBlob(`/admin/audit-log/export?${qs}`);
  }

  listAdmins() {
    return this.get<{ admins: AdminAccount[] }>("/admin/admins");
  }

  createAdmin(input: { name: string; email: string; password: string }) {
    return this.post<{ admin: AdminAccount }>("/admin/admins", input);
  }

  deleteAdmin(id: string) {
    return this.del<{ success: true }>(`/admin/admins/${id}`);
  }

  /**
   * Paginated + searched + sorted server-side (see worker's
   * UserRepository.findPageWithResumeCounts) rather than fetching every
   * user and filtering/sorting in the browser, so this stays fast
   * regardless of how many accounts exist.
   */
  listUsers(params: { page: number; pageSize: number; q?: string; sortKey: string; sortDirection: "asc" | "desc" }) {
    const qs = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      sortKey: params.sortKey,
      sortDirection: params.sortDirection,
      ...(params.q ? { q: params.q } : {}),
    });
    return this.get<{ users: AdminUserSummary[]; total: number; page: number; pageSize: number }>(`/admin/users?${qs}`);
  }

  /** Full filtered result set (not just the current page) as a CSV Blob. */
  exportUsersCsv(params: { q?: string; sortKey: string; sortDirection: "asc" | "desc" }) {
    const qs = new URLSearchParams({
      sortKey: params.sortKey,
      sortDirection: params.sortDirection,
      ...(params.q ? { q: params.q } : {}),
    });
    return this.getBlob(`/admin/users/export?${qs}`);
  }

  bulkSetUsersSuspended(ids: string[], suspended: boolean) {
    return this.post<{ success: true; count: number }>("/admin/users/bulk-suspend", { ids, suspended });
  }

  bulkDeleteUsers(ids: string[]) {
    return this.post<{ success: true; count: number }>("/admin/users/bulk-delete", { ids });
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

  /** Sends the user a password-reset email (same flow as "forgot password" on the login page) rather than the admin setting a specific password directly. */
  sendUserPasswordReset(userId: string) {
    return this.post<{ success: true }>(`/admin/users/${userId}/send-password-reset`, {});
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

  listSkillSuggestions() {
    return this.get<{ skillSuggestions: AdminSkillSuggestion[] }>("/admin/skill-suggestions");
  }

  createSkillSuggestion(input: { professionKey: string; label: string; category: "skill" | "tool"; sortOrder?: number }) {
    return this.post<{ skillSuggestion: AdminSkillSuggestion }>("/admin/skill-suggestions", input);
  }

  updateSkillSuggestion(id: string, input: { professionKey?: string; label?: string; category?: "skill" | "tool"; sortOrder?: number }) {
    return this.put<{ skillSuggestion: AdminSkillSuggestion }>(`/admin/skill-suggestions/${id}`, input);
  }

  deleteSkillSuggestion(id: string) {
    return this.del<{ success: true }>(`/admin/skill-suggestions/${id}`);
  }

  listRoleDescriptions() {
    return this.get<{ roleDescriptions: AdminRoleDescription[] }>("/admin/role-descriptions");
  }

  createRoleDescription(input: {
    keywords: string[];
    category: string;
    descriptor: string;
    traits: [string, string, string];
    outcome: string;
    keyTraits: [string, string, string];
    isFallback?: boolean;
    professionKey?: string | null;
    sortOrder?: number;
  }) {
    return this.post<{ roleDescription: AdminRoleDescription }>("/admin/role-descriptions", input);
  }

  updateRoleDescription(
    id: string,
    input: Partial<{
      keywords: string[];
      category: string;
      descriptor: string;
      traits: [string, string, string];
      outcome: string;
      keyTraits: [string, string, string];
      isFallback: boolean;
      professionKey: string | null;
      sortOrder: number;
    }>
  ) {
    return this.put<{ roleDescription: AdminRoleDescription }>(`/admin/role-descriptions/${id}`, input);
  }

  deleteRoleDescription(id: string) {
    return this.del<{ success: true }>(`/admin/role-descriptions/${id}`);
  }
}
