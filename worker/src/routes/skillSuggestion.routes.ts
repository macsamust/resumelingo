import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SkillSuggestionController } from "../controllers/SkillSuggestionController";

const skillSuggestions = new Hono<AppEnv>();
const controller = new SkillSuggestionController();

skillSuggestions.get("/", controller.list);

export default skillSuggestions;
