import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { SubscriptionController } from "../controllers/SubscriptionController";

const subscriptions = new Hono<AppEnv>();
const controller = new SubscriptionController();

subscriptions.get("/plans", controller.plans);
subscriptions.get("/usage", requireAuth, controller.usage);
subscriptions.post("/change-tier", requireAuth, controller.changeTier);
subscriptions.post("/checkout", requireAuth, controller.checkout);
subscriptions.post("/portal", requireAuth, controller.portal);
subscriptions.post("/cancel", requireAuth, controller.cancel);
subscriptions.post("/resume", requireAuth, controller.resume);

export default subscriptions;
