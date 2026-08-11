import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAdminAuth } from "../middleware/adminAuthMiddleware";
import { AdminAuthController } from "../controllers/AdminAuthController";
import { AdminUserController } from "../controllers/AdminUserController";
import { AdminPlanController } from "../controllers/AdminPlanController";
import { AdminTemplateController } from "../controllers/AdminTemplateController";
import { AdminSkillSuggestionController } from "../controllers/AdminSkillSuggestionController";
import { AdminRoleDescriptionController } from "../controllers/AdminRoleDescriptionController";

const admin = new Hono<AppEnv>();

const authController = new AdminAuthController();
admin.post("/auth/login", authController.login);
admin.get("/auth/me", requireAdminAuth, authController.me);

const userController = new AdminUserController();
admin.get("/users", requireAdminAuth, userController.list);
admin.get("/users/:id/resumes", requireAdminAuth, userController.resumesForUser);
admin.put("/users/:id/tier", requireAdminAuth, userController.changeTier);
admin.put("/users/:id/suspend", requireAdminAuth, userController.setSuspended);
admin.put("/users/:id/password", requireAdminAuth, userController.resetPassword);
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
