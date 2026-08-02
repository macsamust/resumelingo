import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { DashboardController } from "../controllers/DashboardController";

const dashboard = new Hono<AppEnv>();
const controller = new DashboardController();

dashboard.get("/summary", requireAuth, controller.summary);

export default dashboard;
