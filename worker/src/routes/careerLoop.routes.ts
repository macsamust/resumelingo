import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { CareerLoopController } from "../controllers/CareerLoopController";

const careerLoop = new Hono<AppEnv>();
const controller = new CareerLoopController();

careerLoop.use("*", requireAuth);
careerLoop.get("/:id", controller.get);
careerLoop.post("/:id/share", controller.markShared);
careerLoop.post("/:id/letters", controller.markLettersUsed);
careerLoop.post("/:id/dismiss", controller.dismiss);
careerLoop.post("/:id/shown", controller.logShown);
careerLoop.post("/:id/cta-click", controller.logCtaClick);
careerLoop.post("/:id/track-done", controller.logTrackDone);

export default careerLoop;
