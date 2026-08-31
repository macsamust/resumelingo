import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { SkillSuggestionController } from "../controllers/SkillSuggestionController";
import { SkillSuggestionAiController } from "../controllers/SkillSuggestionAiController";

const skillSuggestions = new Hono<AppEnv>();
const controller = new SkillSuggestionController();
const aiController = new SkillSuggestionAiController();

skillSuggestions.get("/", controller.list);
// Unlike the curated list above (public, no auth), the AI-generated
// suggestions call out to Workers AI on every request and are
// Professional/Premium-gated — see SkillSuggestionAiController.
skillSuggestions.post("/ai", requireAuth, aiController.generate);

export default skillSuggestions;
