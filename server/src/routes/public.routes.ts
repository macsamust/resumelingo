import { Router } from "express";
import { PublicController } from "../controllers/PublicController";
import { asyncHandler } from "../controllers/asyncHandler";
import { optionalAuth } from "../middleware/authMiddleware";

const router = Router();
const controller = new PublicController();

router.get("/:slug", optionalAuth, asyncHandler(controller.getBySlug));

export default router;
