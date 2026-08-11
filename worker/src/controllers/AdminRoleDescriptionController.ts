import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

function isTraitTriple(value: unknown): value is [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === "string");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Admin CRUD for role descriptions — see repositories/RoleDescriptionRepository.ts. */
export class AdminRoleDescriptionController {
  list = async (c: Context<AppEnv>) => {
    const { roleDescriptionRepository } = c.get("services");
    return c.json({ roleDescriptions: await roleDescriptionRepository.findAll() });
  };

  create = async (c: Context<AppEnv>) => {
    const { roleDescriptionRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { keywords, category, descriptor, traits, outcome, keyTraits, isFallback, professionKey, sortOrder } = body;
    if (!category || typeof category !== "string" || !category.trim()) {
      return c.json({ error: "category is required." }, 400);
    }
    if (!descriptor || typeof descriptor !== "string" || !descriptor.trim()) {
      return c.json({ error: "descriptor is required." }, 400);
    }
    if (!outcome || typeof outcome !== "string" || !outcome.trim()) {
      return c.json({ error: "outcome is required." }, 400);
    }
    if (!isTraitTriple(traits)) return c.json({ error: "traits must be an array of exactly 3 strings." }, 400);
    if (!isTraitTriple(keyTraits)) return c.json({ error: "keyTraits must be an array of exactly 3 strings." }, 400);
    if (keywords !== undefined && !isStringArray(keywords)) {
      return c.json({ error: "keywords must be an array of strings." }, 400);
    }
    if (professionKey !== undefined && professionKey !== null && typeof professionKey !== "string") {
      return c.json({ error: "professionKey must be a string or null." }, 400);
    }
    const created = await roleDescriptionRepository.create({
      keywords: isStringArray(keywords) ? keywords : [],
      category: category.trim(),
      descriptor: descriptor.trim(),
      traits,
      outcome: outcome.trim(),
      keyTraits,
      isFallback: typeof isFallback === "boolean" ? isFallback : false,
      professionKey: typeof professionKey === "string" ? professionKey.trim() || null : null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    return c.json({ roleDescription: created }, 201);
  };

  update = async (c: Context<AppEnv>) => {
    const { roleDescriptionRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { keywords, category, descriptor, traits, outcome, keyTraits, isFallback, professionKey, sortOrder } = body;
    if (traits !== undefined && !isTraitTriple(traits)) {
      return c.json({ error: "traits must be an array of exactly 3 strings." }, 400);
    }
    if (keyTraits !== undefined && !isTraitTriple(keyTraits)) {
      return c.json({ error: "keyTraits must be an array of exactly 3 strings." }, 400);
    }
    if (keywords !== undefined && !isStringArray(keywords)) {
      return c.json({ error: "keywords must be an array of strings." }, 400);
    }
    if (professionKey !== undefined && professionKey !== null && typeof professionKey !== "string") {
      return c.json({ error: "professionKey must be a string or null." }, 400);
    }
    const updated = await roleDescriptionRepository.update(c.req.param("id")!, {
      keywords: isStringArray(keywords) ? keywords : undefined,
      category: typeof category === "string" ? category.trim() : undefined,
      descriptor: typeof descriptor === "string" ? descriptor.trim() : undefined,
      traits: isTraitTriple(traits) ? traits : undefined,
      outcome: typeof outcome === "string" ? outcome.trim() : undefined,
      keyTraits: isTraitTriple(keyTraits) ? keyTraits : undefined,
      isFallback: typeof isFallback === "boolean" ? isFallback : undefined,
      professionKey: professionKey === undefined ? undefined : typeof professionKey === "string" ? professionKey.trim() || null : null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    });
    if (!updated) return c.json({ error: "Role description not found." }, 404);
    return c.json({ roleDescription: updated });
  };

  remove = async (c: Context<AppEnv>) => {
    const { roleDescriptionRepository } = c.get("services");
    const id = c.req.param("id")!;
    const existing = await roleDescriptionRepository.findById(id);
    if (!existing) return c.json({ error: "Role description not found." }, 404);
    await roleDescriptionRepository.delete(id);
    return c.json({ success: true });
  };
}
