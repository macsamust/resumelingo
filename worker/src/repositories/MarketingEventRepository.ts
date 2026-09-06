import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";

export interface MarketingEventRecord {
  id: string;
  event: string;
  detail: string | null;
  createdAt: string;
}

/**
 * Lightweight, durable funnel-event log — see migration 0035's doc comment
 * for why this exists (no analytics vendor wired into this app anywhere)
 * instead of a real analytics SDK. One row per event, never pruned; small
 * enough in volume that this isn't a concern the way the IP-throttle
 * tables' pruning is.
 */
export class MarketingEventRepository extends BaseRepository<MarketingEventRecord> {
  protected readonly table = "marketing_events";

  async record(event: string, detail?: string): Promise<void> {
    await this.insertRow({
      id: nanoid(12),
      event,
      detail: detail ?? null,
      createdAt: new Date().toISOString(),
    });
  }
}
