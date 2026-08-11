import { Hono } from "hono";
import { SkillSuggestionController } from "../controllers/SkillSuggestionController";

const skillSuggestions = new Hono();
const controller = new SkillSuggestionController();

skillSuggestions.get("/", controller.list);

export default skillSuggestions;
