import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { asyncHandler } from "../controllers/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new AuthController();

router.post("/register", asyncHandler(controller.register));
router.post("/login", asyncHandler(controller.login));
router.get("/me", requireAuth, asyncHandler(controller.me));

export default router;
