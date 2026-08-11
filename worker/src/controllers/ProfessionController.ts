import { Context } from "hono";
import { PROFESSIONS, getProfessionByKey } from "../config/professions";

export class ProfessionController {
  list = async (c: Context) => {
    return c.json({ professions: PROFESSIONS.map(({ key, label }) => ({ key, label })) });
  };

  questions = async (c: Context) => {
    const profession = getProfessionByKey(c.req.param("key")!);
    if (!profession) return c.json({ error: "Unknown profession." }, 404);
    return c.json({ profession });
  };
}
