import { Router } from "express";
import { SubscriptionController } from "../controllers/SubscriptionController";
import { asyncHandler } from "../controllers/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new SubscriptionController();

router.get("/plans", asyncHandler(controller.plans));
router.get("/usage", requireAuth, asyncHandler(controller.usage));
router.post("/change-tier", requireAuth, asyncHandler(controller.changeTier));

export default router;
