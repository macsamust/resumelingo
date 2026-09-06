import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";

// Allowlisted rather than free-form — this endpoint is unauthenticated (it
// fires from the logged-out Pricing page too), so without a fixed set of
// known event names it'd be an open write sink for arbitrary strings.
const ALLOWED_EVENTS = new Set(["plan_clicked"]);
const MAX_DETAIL_LENGTH = 200;

/**
 * Records a single funnel event — see MarketingEventRepository/migration
 * 0035's doc comments for why this exists instead of a real analytics
 * vendor. Fire-and-forget from the client's perspective (see client's
 * MarketingEventApi.record, which swallows its own errors), so a failure
 * here should never surface as a visible error to the person clicking a
 * pricing button.
 */
export class MarketingEventController {
  record = async (c: Context<AppEnv>) => {
    const { marketingEventRepository } = c.get("services");
    const body = await c.req.json().catch(() => ({}));
    const { event, detail } = (body ?? {}) as Record<string, unknown>;
    if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
      return c.json({ error: "Unknown event." }, 400);
    }
    await marketingEventRepository.record(event, typeof detail === "string" ? detail.slice(0, MAX_DETAIL_LENGTH) : undefined);
    return c.body(null, 204);
  };
}
