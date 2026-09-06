import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { MarketingEventController } from "../controllers/MarketingEventController";

// Deliberately no requireAuth — fires from the logged-out Pricing page
// (marketing site) as well as the logged-in dashboard's own upgrade CTA.
const marketingEvents = new Hono<AppEnv>();
const controller = new MarketingEventController();

marketingEvents.post("/", controller.record);

export default marketingEvents;
