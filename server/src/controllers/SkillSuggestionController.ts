import { Request, Response } from "express";
import { SkillSuggestionRepository } from "../repositories/SkillSuggestionRepository";

/**
 * Public (read-only) endpoint feeding the Edit Resume "Skills & Tools"
 * picker (Portrait template — see client's SkillsAndToolsEditor.tsx).
 * `?profession=<key>` scopes to one profession's suggestions; omitted
 * returns everything, grouped client-side if ever needed.
 */
export class SkillSuggestionController {
  constructor(private readonly skillSuggestions: SkillSuggestionRepository = new SkillSuggestionRepository()) {}

  list = async (req: Request, res: Response) => {
    const professionKey = typeof req.query.profession === "string" ? req.query.profession : undefined;
    const suggestions = professionKey
      ? await this.skillSuggestions.findByProfession(professionKey)
      : await this.skillSuggestions.findAll();
    res.json({
      skillSuggestions: suggestions.map((s) => ({ id: s.id, professionKey: s.professionKey, label: s.label, category: s.category })),
    });
  };
}
