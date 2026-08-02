import { Hono } from "hono";
import { TemplateController } from "../controllers/TemplateController";

const templates = new Hono();
const controller = new TemplateController();

templates.get("/", controller.list);

export default templates;
