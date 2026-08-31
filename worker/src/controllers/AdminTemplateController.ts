import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { TemplateCategory } from "../types";

function slugifyKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export class AdminTemplateController {
  list = async (c: Context<AppEnv>) => {
    const { templateRepository } = c.get("services");
    return c.json({ templates: await templateRepository.findAll() });
  };

  create = async (c: Context<AppEnv>) => {
    const { templateRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { name, description, key, category, enabled, sortOrder } = body;
    if (!name || typeof name !== "string") {
      return c.json({ error: "name is required." }, 400);
    }
    const nameStr: string = name;
    const keyStr = typeof key === "string" || typeof key === "number" ? String(key).trim() : "";
    const templateKey: string = keyStr || slugifyKey(nameStr);
    if (!templateKey) {
      return c.json({ error: "Could not derive a template key from that name, provide one explicitly." }, 400);
    }
    const existing = await templateRepository.findByKey(templateKey);
    if (existing) {
      return c.json({ error: `A template with key "${templateKey}" already exists.` }, 409);
    }
    const created = await templateRepository.create({
      key: templateKey,
      name: nameStr,
      description: (description as string) ?? "",
      category: category as TemplateCategory | undefined,
      enabled: (enabled as boolean) ?? true,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    });
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "template.create",
      targetType: "template",
      targetId: templateKey,
      detail: nameStr,
    });
    return c.json({ template: created }, 201);
  };

  update = async (c: Context<AppEnv>) => {
    const { templateRepository, adminAuditLogRepository } = c.get("services");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { name, description, category, enabled, sortOrder } = body;
    const key = c.req.param("key")!;
    const updated = await templateRepository.update(key, {
      name: name as string | undefined,
      description: description as string | undefined,
      category: category as TemplateCategory | undefined,
      enabled: enabled as boolean | undefined,
      sortOrder: sortOrder as number | undefined,
    });
    if (!updated) return c.json({ error: "Template not found." }, 404);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "template.update",
      targetType: "template",
      targetId: key,
      detail: updated.name,
    });
    return c.json({ template: updated });
  };

  remove = async (c: Context<AppEnv>) => {
    const { templateRepository, adminAuditLogRepository } = c.get("services");
    const key = c.req.param("key")!;
    const existing = await templateRepository.findByKey(key);
    if (!existing) return c.json({ error: "Template not found." }, 404);
    await templateRepository.delete(key);
    await adminAuditLogRepository.log(c.get("admin")!, {
      action: "template.delete",
      targetType: "template",
      targetId: key,
      detail: existing.name,
    });
    return c.json({ success: true });
  };
}
