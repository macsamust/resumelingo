import { Router } from "express";
import { PublicController } from "../controllers/PublicController";
import { asyncHandler } from "../controllers/asyncHandler";

const router = Router();
const controller = new PublicController();

router.get("/:slug", asyncHandler(controller.getBySlug));

export default router;
