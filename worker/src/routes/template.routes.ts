import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { TemplateController } from "../controllers/TemplateController";

const templates = new Hono<AppEnv>();
const controller = new TemplateController();

templates.get("/", controller.list);

export default templates;
