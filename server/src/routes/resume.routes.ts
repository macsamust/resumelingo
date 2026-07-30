import { Router } from "express";
import { ResumeController } from "../controllers/ResumeController";
import { asyncHandler } from "../controllers/asyncHandler";
import { requireAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new ResumeController();

router.use(requireAuth);
router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.get("/:id", asyncHandler(controller.get));
router.put("/:id", asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));

export default router;
