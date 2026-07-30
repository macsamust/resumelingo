import { Router } from "express";
import { ProfessionController } from "../controllers/ProfessionController";
import { asyncHandler } from "../controllers/asyncHandler";

const router = Router();
const controller = new ProfessionController();

router.get("/", asyncHandler(controller.list));
router.get("/:key", asyncHandler(controller.questions));

export default router;
