import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { CareerLoopEventStep } from "../repositories/CareerLoopEventRepository";

const VALID_STEPS: CareerLoopEventStep[] = ["share", "track", "letters"];

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

  /**
   * Basic usage logging (see migrations/0046_career_loop_events.sql) — added
   * before turning CAREER_LOOP_ENABLED on for real, since there was
   * previously no way to tell whether the badge/modal ever actually gets
   * noticed. "shown" and "cta_click" are the two purely client-observed
   * moments (the badge/modal was opened, a step's action was clicked);
   * step_done/completed for Share and Letters are instead logged
   * server-side inside markShared/markLettersUsed above, so they can never
   * drift from the real progress row. Fire-and-forget on the client side —
   * this always returns 204 immediately rather than making a UI
   * interaction wait on an analytics write.
   */
  logShown = async (c: Context<AppEnv>) => {
    const { careerLoopService, careerLoopEnabled, resumeService } = c.get("services");
    if (!careerLoopEnabled) return this.notFound(c);
    const user = c.get("user")!;
    const resumeId = c.req.param("id")!;
    await resumeService.getOwned(user.id, resumeId);
    careerLoopService.logShown(resumeId, user.id);
    return c.body(null, 204);
  };

  logCtaClick = async (c: Context<AppEnv>) => {
    const { careerLoopService, careerLoopEnabled, resumeService } = c.get("services");
    if (!careerLoopEnabled) return this.notFound(c);
    const user = c.get("user")!;
    const resumeId = c.req.param("id")!;
    const body = await c.req.json().catch(() => ({}));
    const step = body?.step;
    if (!VALID_STEPS.includes(step)) return c.json({ error: "Invalid step." }, 400);
    await resumeService.getOwned(user.id, resumeId);
    careerLoopService.logCtaClick(resumeId, user.id, step);
    return c.body(null, 204);
  };

  /** See CareerLoopService.logTrackStepDone's doc comment for why Track alone needs its own client-triggered logging call instead of piggybacking on a mark* mutation. */
  logTrackDone = async (c: Context<AppEnv>) => {
    const { careerLoopService, careerLoopEnabled, resumeService } = c.get("services");
    if (!careerLoopEnabled) return this.notFound(c);
    const user = c.get("user")!;
    const resumeId = c.req.param("id")!;
    await resumeService.getOwned(user.id, resumeId);
    await careerLoopService.logTrackStepDone(resumeId, user.id);
    return c.body(null, 204);
  };
}
