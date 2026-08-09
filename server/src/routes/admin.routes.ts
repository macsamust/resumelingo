import { Router } from "express";
import { AdminAuthController } from "../controllers/AdminAuthController";
import { AdminUserController } from "../controllers/AdminUserController";
import { AdminPlanController } from "../controllers/AdminPlanController";
import { AdminTemplateController } from "../controllers/AdminTemplateController";
import { AdminSkillSuggestionController } from "../controllers/AdminSkillSuggestionController";
import { AdminRoleDescriptionController } from "../controllers/AdminRoleDescriptionController";
import { asyncHandler } from "../controllers/asyncHandler";
import { requireAdminAuth } from "../middleware/adminAuthMiddleware";

const router = Router();

const authController = new AdminAuthController();
router.post("/auth/login", asyncHandler(authController.login));
router.get("/auth/me", requireAdminAuth, asyncHandler(authController.me));

const userController = new AdminUserController();
router.get("/users", requireAdminAuth, asyncHandler(userController.list));
router.get("/users/:id/resumes", requireAdminAuth, asyncHandler(userController.resumesForUser));
router.put("/users/:id/tier", requireAdminAuth, asyncHandler(userController.changeTier));
router.put("/users/:id/suspend", requireAdminAuth, asyncHandler(userController.setSuspended));
router.put("/users/:id/password", requireAdminAuth, asyncHandler(userController.resetPassword));
router.delete("/users/:id", requireAdminAuth, asyncHandler(userController.remove));

const planController = new AdminPlanController();
router.get("/plans", requireAdminAuth, asyncHandler(planController.list));
router.put("/plans/:tier", requireAdminAuth, asyncHandler(planController.update));

const templateController = new AdminTemplateController();
router.get("/templates", requireAdminAuth, asyncHandler(templateController.list));
router.post("/templates", requireAdminAuth, asyncHandler(templateController.create));
router.put("/templates/:key", requireAdminAuth, asyncHandler(templateController.update));
router.delete("/templates/:key", requireAdminAuth, asyncHandler(templateController.remove));

const skillSuggestionController = new AdminSkillSuggestionController();
router.get("/skill-suggestions", requireAdminAuth, asyncHandler(skillSuggestionController.list));
router.post("/skill-suggestions", requireAdminAuth, asyncHandler(skillSuggestionController.create));
router.put("/skill-suggestions/:id", requireAdminAuth, asyncHandler(skillSuggestionController.update));
router.delete("/skill-suggestions/:id", requireAdminAuth, asyncHandler(skillSuggestionController.remove));

const roleDescriptionController = new AdminRoleDescriptionController();
router.get("/role-descriptions", requireAdminAuth, asyncHandler(roleDescriptionController.list));
router.post("/role-descriptions", requireAdminAuth, asyncHandler(roleDescriptionController.create));
router.put("/role-descriptions/:id", requireAdminAuth, asyncHandler(roleDescriptionController.update));
router.delete("/role-descriptions/:id", requireAdminAuth, asyncHandler(roleDescriptionController.remove));

export default router;
