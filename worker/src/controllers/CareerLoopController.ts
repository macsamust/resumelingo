import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

/**
 * "Full Circle" post-publish coach — see CareerLoopService.ts. Every route
 * here is a 404 while the feature is disabled (Env.CAREER_LOOP_ENABLED
 * unset or "false"), same shape as any other Premium-only tool's gate, so a
 * curious client can't tell the feature apart from one that was never
 * built at all.
 */
export class CareerLoopController {
  private notFound(c: Context<AppEnv>) {
    return c.json({ error: "Not found." }, 404);
  }

  get = async (c: Context<AppEnv>) => {
    const { careerLoopService, careerLoopEnabled, resumeService } = c.get("services");
    if (!careerLoopEnabled) return this.notFound(c);
    const user = c.get("user")!;
    const resumeId = c.req.param("id")!;
    await resumeService.getOwned(user.id, resumeId); // throws if not found/owned
    const progress = await careerLoopService.getProgress(resumeId, user.id);
    return c.json({ progress });
  };

  markShared = async (c: Context<AppEnv>) => {
    const { careerLoopService, careerLoopEnabled, resumeService } = c.get("services");
    if (!careerLoopEnabled) return this.notFound(c);
    const user = c.get("user")!;
    const resumeId = c.req.param("id")!;
    await resumeService.getOwned(user.id, resumeId);
    await careerLoopService.markShared(resumeId, user.id);
    const progress = await careerLoopService.getProgress(resumeId, user.id);
    return c.json({ progress });
  };

  markLettersUsed = async (c: Context<AppEnv>) => {
    const { careerLoopService, careerLoopEnabled, resumeService } = c.get("services");
    if (!careerLoopEnabled) return this.notFound(c);
    const user = c.get("user")!;
    const resumeId = c.req.param("id")!;
    await resumeService.getOwned(user.id, resumeId);
    await careerLoopService.markLettersUsed(resumeId, user.id, user.subscriptionTier);
    const progress = await careerLoopService.getProgress(resumeId, user.id);
    return c.json({ progress });
  };

  dismiss = async (c: Context<AppEnv>) => {
    const { careerLoopService, careerLoopEnabled, resumeService } = c.get("services");
    if (!careerLoopEnabled) return this.notFound(c);
    const user = c.get("user")!;
    const resumeId = c.req.param("id")!;
    await resumeService.getOwned(user.id, resumeId);
    await careerLoopService.dismiss(resumeId, user.id);
    return c.body(null, 204);
  };
}
