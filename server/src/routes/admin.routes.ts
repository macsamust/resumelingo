import { Router } from "express";
import { AdminAuthController } from "../controllers/AdminAuthController";
import { AdminUserController } from "../controllers/AdminUserController";
import { AdminPlanController } from "../controllers/AdminPlanController";
import { AdminTemplateController } from "../controllers/AdminTemplateController";
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

export default router;
