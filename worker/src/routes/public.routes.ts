import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { PublicController } from "../controllers/PublicController";

const publicRoutes = new Hono<AppEnv>();
const controller = new PublicController();

publicRoutes.get("/:slug", controller.getBySlug);

export default publicRoutes;
