import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";
import { asyncHandler } from "../controllers/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new DashboardController();

router.get("/summary", requireAuth, asyncHandler(controller.summary));

export default router;
