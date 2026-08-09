import { Router } from "express";
import { ThankYouLetterController } from "../controllers/ThankYouLetterController";
import { asyncHandler } from "../controllers/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new ThankYouLetterController();

router.use(requireAuth);
router.get("/scenarios", asyncHandler(controller.scenarios));
router.post("/", asyncHandler(controller.generate));

export default router;
