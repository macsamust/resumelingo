import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/**
 * Public (read-only) endpoint feeding the Edit Resume "Skills & Tools"
 * picker (Portrait template). `?profession=<key>` scopes to one
 * profession's suggestions; omitted returns everything. Now D1-backed via
 * SkillSuggestionRepository (see migrations/0004_admin_catalog.sql)
 * instead of the static config/skillSuggestions.ts list, so admin edits
 * (see AdminSkillSuggestionController) show up immediately.
 */
export class SkillSuggestionController {
  list = async (c: Context<AppEnv>) => {
    const { skillSuggestionRepository } = c.get("services");
    const professionKey = c.req.query("profession");
    const suggestions = professionKey
      ? await skillSuggestionRepository.findByProfession(professionKey)
      : await skillSuggestionRepository.findAll();
    return c.json({ skillSuggestions: suggestions });
  };
}
