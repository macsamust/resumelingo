import { Router } from "express";
import { TemplateController } from "../controllers/TemplateController";
import { asyncHandler } from "../controllers/asyncHandler";

const router = Router();
const controller = new TemplateController();

router.get("/", asyncHandler(controller.list));

export default router;
