import { Router } from "express";
import { SkillSuggestionController } from "../controllers/SkillSuggestionController";
import { asyncHandler } from "../controllers/asyncHandler";

const router = Router();
const controller = new SkillSuggestionController();
router.get("/", asyncHandler(controller.list));

export default router;
