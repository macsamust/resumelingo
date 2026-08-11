import { Context } from "hono";
import { listSkillSuggestions } from "../config/skillSuggestions";

/**
 * Public (read-only) endpoint feeding the Edit Resume "Skills & Tools"
 * picker (Portrait template). `?profession=<key>` scopes to one
 * profession's suggestions; omitted returns everything. Unlike server/'s
 * version (DB-backed via SkillSuggestionRepository, admin-editable), this
 * reads directly from the static config/skillSuggestions.ts list — the
 * admin console is out of scope for this port.
 */
export class SkillSuggestionController {
  list = async (c: Context) => {
    const professionKey = c.req.query("profession");
    const suggestions = listSkillSuggestions(professionKey);
    return c.json({ skillSuggestions: suggestions });
  };
}
