import { Response } from "express";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { AdminAuthenticatedRequest } from "../middleware/adminAuthMiddleware";

function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export class AdminTemplateController {
  constructor(private readonly templates: TemplateRepository = new TemplateRepository()) {}

  list = async (_req: AdminAuthenticatedRequest, res: Response) => {
    res.json({ templates: await this.templates.findAll() });
  };

  create = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { name, description, key, enabled, sortOrder } = req.body ?? {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required." });
    }
    const templateKey = (key && String(key).trim()) || slugifyKey(name);
    if (!templateKey) {
      return res.status(400).json({ error: "Could not derive a template key from that name — provide one explicitly." });
    }
    const existing = await this.templates.findByKey(templateKey);
    if (existing) {
      return res.status(409).json({ error: `A template with key "${templateKey}" already exists.` });
    }
    const created = await this.templates.create({
      key: templateKey,
      name,
      description: description ?? "",
      enabled: enabled ?? true,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    res.status(201).json({ template: created });
  };

  update = async (req: AdminAuthenticatedRequest, res: Response) => {
    const { name, description, enabled, sortOrder } = req.body ?? {};
    const updated = await this.templates.update(req.params.key, { name, description, enabled, sortOrder });
    if (!updated) return res.status(404).json({ error: "Template not found." });
    res.json({ template: updated });
  };

  remove = async (req: AdminAuthenticatedRequest, res: Response) => {
    const existing = await this.templates.findByKey(req.params.key);
    if (!existing) return res.status(404).json({ error: "Template not found." });
    await this.templates.delete(req.params.key);
    res.json({ success: true });
  };
}
