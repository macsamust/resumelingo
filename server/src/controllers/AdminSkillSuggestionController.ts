import { Response } from "express";
import { SkillSuggestionRepository } from "../repositories/SkillSuggestionRepository";
import { AdminAuthenticatedRequest } from "../middleware/adminAuthMiddleware";

function isValidCategory(value: unknown): value is "skill" | "tool" {
  return value === "skill" || value === "tool";
}

/** Admin CRUD for the "Skills & Tools" picker's suggestion keywords — see repositories/SkillSuggestionRepository.ts. */
export class AdminSkillSuggestionController {
  constructor(private readonly skillSuggestions: SkillSuggestionRepository = new SkillSuggestionRepository()) {}

  list = async (_req: AdminAuthenticatedRequest, res: Response) => {
    res.json({ skillSuggestions: await this.skillSuggestions.findAll() });
  };

  create = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { professionKey, label, category, sortOrder } = req.body ?? {};
    if (!professionKey || typeof professionKey !== "string") {
      return res.status(400).json({ error: "professionKey is required." });
    }
    if (!label || typeof label !== "string" || !label.trim()) {
      return res.status(400).json({ error: "label is required." });
    }
    if (!isValidCategory(category)) {
      return res.status(400).json({ error: "category must be 'skill' or 'tool'." });
    }
    const created = await this.skillSuggestions.create({
      professionKey: professionKey.trim(),
      label: label.trim(),
      category,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    res.status(201).json({ skillSuggestion: created });
  };

  update = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { professionKey, label, category, sortOrder } = req.body ?? {};
    if (category !== undefined && !isValidCategory(category)) {
      return res.status(400).json({ error: "category must be 'skill' or 'tool'." });
    }
    const updated = await this.skillSuggestions.update(req.params.id, {
      professionKey: typeof professionKey === "string" ? professionKey.trim() : undefined,
      label: typeof label === "string" ? label.trim() : undefined,
      category: isValidCategory(category) ? category : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    });
    if (!updated) return res.status(404).json({ error: "Skill suggestion not found." });
    res.json({ skillSuggestion: updated });
  };

  remove = async (req: AdminAuthenticatedRequest, res: Response) => {
    const existing = await this.skillSuggestions.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Skill suggestion not found." });
    await this.skillSuggestions.delete(req.params.id);
    res.json({ success: true });
  };
}
