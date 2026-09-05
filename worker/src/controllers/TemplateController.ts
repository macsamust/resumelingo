import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { computePopularTemplates } from "../services/popularTemplates";

/**
 * Public (read-only) endpoint feeding the New/Edit Resume template picker.
 * Now D1-backed via TemplateRepository (see migrations/0004_admin_catalog.sql)
 * instead of the static config/templates.ts array, so admin edits (see
 * AdminTemplateController) show up immediately without a redeploy. Only
 * enabled templates are offered — same "enabled: true" filter server/'s
 * config/templates.ts's listTemplates() applies.
 */
export class TemplateController {
  list = async (c: Context<AppEnv>) => {
    const { templateRepository } = c.get("services");
    const templates = await templateRepository.findAll();
    return c.json({
      templates: templates
        .filter((t) => t.enabled)
        .map((t) => ({ key: t.key, name: t.name, description: t.description, category: t.category })),
    });
  };

  /**
   * GET /api/templates/popular-by-profession — one templateKey per
   * profession, feeding the picker's "most popular with <profession>"
   * indicator. See popularTemplates.ts's doc comment for the sample-size
   * floor and why "classic" never counts.
   */
  popularByProfession = async (c: Context<AppEnv>) => {
    const { resumeRepository } = c.get("services");
    const counts = await resumeRepository.countByProfessionAndTemplate();
    return c.json({ popularTemplates: computePopularTemplates(counts) });
  };
}
