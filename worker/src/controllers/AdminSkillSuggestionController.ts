import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

function isValidCategory(value: unknown): value is "skill" | "tool" {
  return value === "skill" || value === "tool";
}

/** Admin CRUD for the "Skills & Tools" picker's suggestion keywords — see repositories/SkillSuggestionRepository.ts. */
export class AdminSkillSuggestionController {
  list = async (c: Context<AppEnv>) => {
    const { skillSuggestionRepository } = c.get("services");
    return c.json({ skillSuggestions: await skillSuggestionRepository.findAll() });
  };

  create = async (c: Context<AppEnv>) => {
    const { skillSuggestionRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { professionKey, label, category, sortOrder } = body;
    if (!professionKey || typeof professionKey !== "string") {
      return c.json({ error: "professionKey is required." }, 400);
    }
    if (!label || typeof label !== "string" || !label.trim()) {
      return c.json({ error: "label is required." }, 400);
    }
    if (!isValidCategory(category)) {
      return c.json({ error: "category must be 'skill' or 'tool'." }, 400);
    }
    const created = await skillSuggestionRepository.create({
      professionKey: professionKey.trim(),
      label: label.trim(),
      category,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    return c.json({ skillSuggestion: created }, 201);
  };

  update = async (c: Context<AppEnv>) => {
    const { skillSuggestionRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { professionKey, label, category, sortOrder } = body;
    if (category !== undefined && !isValidCategory(category)) {
      return c.json({ error: "category must be 'skill' or 'tool'." }, 400);
    }
    const updated = await skillSuggestionRepository.update(c.req.param("id")!, {
      professionKey: typeof professionKey === "string" ? professionKey.trim() : undefined,
      label: typeof label === "string" ? label.trim() : undefined,
      category: isValidCategory(category) ? category : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    });
    if (!updated) return c.json({ error: "Skill suggestion not found." }, 404);
    return c.json({ skillSuggestion: updated });
  };

  remove = async (c: Context<AppEnv>) => {
    const { skillSuggestionRepository } = c.get("services");
    const id = c.req.param("id")!;
    const existing = await skillSuggestionRepository.findById(id);
    if (!existing) return c.json({ error: "Skill suggestion not found." }, 404);
    await skillSuggestionRepository.delete(id);
    return c.json({ success: true });
  };
}
