import { Router } from "express";
import { CareerCoachController } from "../controllers/CareerCoachController";
import { asyncHandler } from "../controllers/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new CareerCoachController();

router.use(requireAuth);
router.post("/ask", asyncHandler(controller.ask));

export default router;
