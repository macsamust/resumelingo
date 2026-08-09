import { Response } from "express";
import { RoleDescriptionRepository } from "../repositories/RoleDescriptionRepository";
import { AdminAuthenticatedRequest } from "../middleware/adminAuthMiddleware";

function isTraitTriple(value: unknown): value is [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === "string");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Admin CRUD for role descriptions — see repositories/RoleDescriptionRepository.ts. */
export class AdminRoleDescriptionController {
  constructor(private readonly roleDescriptions: RoleDescriptionRepository = new RoleDescriptionRepository()) {}

  list = async (_req: AdminAuthenticatedRequest, res: Response) => {
    res.json({ roleDescriptions: await this.roleDescriptions.findAll() });
  };

  create = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { keywords, category, descriptor, traits, outcome, keyTraits, isFallback, sortOrder } = req.body ?? {};
    if (!category || typeof category !== "string" || !category.trim()) {
      return res.status(400).json({ error: "category is required." });
    }
    if (!descriptor || typeof descriptor !== "string" || !descriptor.trim()) {
      return res.status(400).json({ error: "descriptor is required." });
    }
    if (!outcome || typeof outcome !== "string" || !outcome.trim()) {
      return res.status(400).json({ error: "outcome is required." });
    }
    if (!isTraitTriple(traits)) return res.status(400).json({ error: "traits must be an array of exactly 3 strings." });
    if (!isTraitTriple(keyTraits)) return res.status(400).json({ error: "keyTraits must be an array of exactly 3 strings." });
    if (keywords !== undefined && !isStringArray(keywords)) {
      return res.status(400).json({ error: "keywords must be an array of strings." });
    }
    const created = await this.roleDescriptions.create({
      keywords: isStringArray(keywords) ? keywords : [],
      category: category.trim(),
      descriptor: descriptor.trim(),
      traits,
      outcome: outcome.trim(),
      keyTraits,
      isFallback: typeof isFallback === "boolean" ? isFallback : false,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    res.status(201).json({ roleDescription: created });
  };

  update = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { keywords, category, descriptor, traits, outcome, keyTraits, isFallback, sortOrder } = req.body ?? {};
    if (traits !== undefined && !isTraitTriple(traits)) {
      return res.status(400).json({ error: "traits must be an array of exactly 3 strings." });
    }
    if (keyTraits !== undefined && !isTraitTriple(keyTraits)) {
      return res.status(400).json({ error: "keyTraits must be an array of exactly 3 strings." });
    }
    if (keywords !== undefined && !isStringArray(keywords)) {
      return res.status(400).json({ error: "keywords must be an array of strings." });
    }
    const updated = await this.roleDescriptions.update(req.params.id, {
      keywords: isStringArray(keywords) ? keywords : undefined,
      category: typeof category === "string" ? category.trim() : undefined,
      descriptor: typeof descriptor === "string" ? descriptor.trim() : undefined,
      traits: isTraitTriple(traits) ? traits : undefined,
      outcome: typeof outcome === "string" ? outcome.trim() : undefined,
      keyTraits: isTraitTriple(keyTraits) ? keyTraits : undefined,
      isFallback: typeof isFallback === "boolean" ? isFallback : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
    });
    if (!updated) return res.status(404).json({ error: "Role description not found." });
    res.json({ roleDescription: updated });
  };

  remove = async (req: AdminAuthenticatedRequest, res: Response) => {
    const existing = await this.roleDescriptions.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Role description not found." });
    await this.roleDescriptions.delete(req.params.id);
    res.json({ success: true });
  };
}
