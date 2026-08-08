import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { PublicController } from "../controllers/PublicController";
import { optionalAuth } from "../middleware/authMiddleware";

const publicRoutes = new Hono<AppEnv>();
const controller = new PublicController();

publicRoutes.get("/:slug", optionalAuth, controller.getBySlug);

export default publicRoutes;
