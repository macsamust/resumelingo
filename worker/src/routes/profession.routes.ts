import { Hono } from "hono";
import { ProfessionController } from "../controllers/ProfessionController";

const professions = new Hono();
const controller = new ProfessionController();

professions.get("/", controller.list);
professions.get("/:key", controller.questions);

export default professions;
