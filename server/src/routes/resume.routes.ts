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
router.post("/:id/clone", asyncHandler(controller.clone));
router.put("/:id", asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));
router.post("/:id/keyword-check", asyncHandler(controller.recordKeywordCheck));
router.get("/:id/versions", asyncHandler(controller.listVersions));
router.post("/:id/versions/:versionId/restore", asyncHandler(controller.restoreVersion));

export default router;
