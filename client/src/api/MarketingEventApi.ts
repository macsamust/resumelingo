import { ApiClient } from "./ApiClient";

/** Logs a lightweight funnel event — see worker's MarketingEventController.ts for why this exists instead of a real analytics vendor (none is wired into this app). Unauthenticated: fires from the logged-out Pricing page too. */
export class MarketingEventApi extends ApiClient {
  /** Fire-and-forget — a failed log shouldn't block or delay whatever the person was actually doing (clicking a pricing button). */
  record(event: string, detail?: string): void {
    this.post<void>("/marketing-events", { event, detail }).catch(() => {});
  }
}
