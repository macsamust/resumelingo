import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAdminAuth } from "../middleware/adminAuthMiddleware";
import { AdminAuthController } from "../controllers/AdminAuthController";
import { AdminUserController } from "../controllers/AdminUserController";
import { AdminPlanController } from "../controllers/AdminPlanController";
import { AdminTemplateController } from "../controllers/AdminTemplateController";
import { AdminSkillSuggestionController } from "../controllers/AdminSkillSuggestionController";
import { AdminRoleDescriptionController } from "../controllers/AdminRoleDescriptionController";
import { AdminDashboardController } from "../controllers/AdminDashboardController";
import { AdminResumeController } from "../controllers/AdminResumeController";
import { AdminAuditLogController } from "../controllers/AdminAuditLogController";
import { AdminManagementController } from "../controllers/AdminManagementController";
import { AdminSecurityController } from "../controllers/AdminSecurityController";
import { AdminSecurityEventController } from "../controllers/AdminSecurityEventController";

const admin = new Hono<AppEnv>();

const authController = new AdminAuthController();
admin.post("/auth/login", authController.login);
admin.get("/auth/me", requireAdminAuth, authController.me);

const dashboardController = new AdminDashboardController();
admin.get("/dashboard/summary", requireAdminAuth, dashboardController.summary);

const resumeSearchController = new AdminResumeController();
admin.get("/resumes", requireAdminAuth, resumeSearchController.search);
admin.get("/resumes/export", requireAdminAuth, resumeSearchController.exportCsv);
admin.post("/resumes/bulk-delete", requireAdminAuth, resumeSearchController.bulkDelete);
admin.get("/resumes/:id", requireAdminAuth, resumeSearchController.get);
admin.put("/resumes/:id", requireAdminAuth, resumeSearchController.update);

const auditLogController = new AdminAuditLogController();
admin.get("/audit-log", requireAdminAuth, auditLogController.list);
admin.get("/audit-log/export", requireAdminAuth, auditLogController.exportCsv);
admin.get("/audit-log/verify-integrity", requireAdminAuth, auditLogController.verifyIntegrity);

const adminManagementController = new AdminManagementController();
admin.get("/admins", requireAdminAuth, adminManagementController.list);
admin.post("/admins", requireAdminAuth, adminManagementController.create);
admin.delete("/admins/:id", requireAdminAuth, adminManagementController.remove);

const adminSecurityController = new AdminSecurityController();
admin.post("/security/revoke-sessions", requireAdminAuth, adminSecurityController.revokeSessions);
admin.post("/security/totp/enroll", requireAdminAuth, adminSecurityController.beginTotpEnroll);
admin.post("/security/totp/confirm", requireAdminAuth, adminSecurityController.confirmTotpEnroll);
admin.post("/security/totp/disable", requireAdminAuth, adminSecurityController.disableTotp);

const securityEventController = new AdminSecurityEventController();
admin.get("/security-events", requireAdminAuth, securityEventController.list);

const userController = new AdminUserController();
admin.get("/users", requireAdminAuth, userController.list);
admin.get("/users/export", requireAdminAuth, userController.exportCsv);
admin.post("/users/bulk-suspend", requireAdminAuth, userController.bulkSetSuspended);
admin.post("/users/bulk-delete", requireAdminAuth, userController.bulkRemove);
admin.get("/users/:id/resumes", requireAdminAuth, userController.resumesForUser);
admin.put("/users/:id/tier", requireAdminAuth, userController.changeTier);
admin.put("/users/:id/suspend", requireAdminAuth, userController.setSuspended);
admin.post("/users/:id/send-password-reset", requireAdminAuth, userController.sendPasswordReset);
admin.delete("/users/:id", requireAdminAuth, userController.remove);

const planController = new AdminPlanController();
admin.get("/plans", requireAdminAuth, planController.list);
admin.put("/plans/:tier", requireAdminAuth, planController.update);

const templateController = new AdminTemplateController();
admin.get("/templates", requireAdminAuth, templateController.list);
admin.post("/templates", requireAdminAuth, templateController.create);
admin.put("/templates/:key", requireAdminAuth, templateController.update);
admin.delete("/templates/:key", requireAdminAuth, templateController.remove);

const skillSuggestionController = new AdminSkillSuggestionController();
admin.get("/skill-suggestions", requireAdminAuth, skillSuggestionController.list);
admin.post("/skill-suggestions", requireAdminAuth, skillSuggestionController.create);
admin.put("/skill-suggestions/:id", requireAdminAuth, skillSuggestionController.update);
admin.delete("/skill-suggestions/:id", requireAdminAuth, skillSuggestionController.remove);

const roleDescriptionController = new AdminRoleDescriptionController();
admin.get("/role-descriptions", requireAdminAuth, roleDescriptionController.list);
admin.post("/role-descriptions", requireAdminAuth, roleDescriptionController.create);
admin.put("/role-descriptions/:id", requireAdminAuth, roleDescriptionController.update);
admin.delete("/role-descriptions/:id", requireAdminAuth, roleDescriptionController.remove);

export default admin;
