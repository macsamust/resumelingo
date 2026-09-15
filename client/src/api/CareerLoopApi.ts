import { ApiClient } from "./ApiClient";
import { CareerLoopProgress } from "../types";

/**
 * "Full Circle" post-publish coach — see worker's CareerLoopController.ts.
 * Every method here 404s while the feature flag (CAREER_LOOP_ENABLED) is
 * off, same as a route that doesn't exist — callers should treat that as
 * "don't render the coach," not surface it as an error.
 */
export class CareerLoopApi extends ApiClient {
  getProgress(resumeId: string) {
    return this.get<{ progress: CareerLoopProgress }>(`/career-loop/${resumeId}`);
  }

  markShared(resumeId: string) {
    return this.post<{ progress: CareerLoopProgress }>(`/career-loop/${resumeId}/share`, {});
  }

  markLettersUsed(resumeId: string) {
    return this.post<{ progress: CareerLoopProgress }>(`/career-loop/${resumeId}/letters`, {});
  }

  dismiss(resumeId: string) {
    return this.del<void>(`/career-loop/${resumeId}/dismiss`);
  }

  /** Basic usage logging (see worker's migrations/0046_career_loop_events.sql) — fire-and-forget by convention at every call site, never awaited/surfaced as an error. Badge/modal open. */
  logShown(resumeId: string) {
    return this.post<void>(`/career-loop/${resumeId}/shown`, {});
  }

  /** A step's action button/link was clicked (Copy link / Log an application / Write a cover letter). */
  logCtaClick(resumeId: string, step: "share" | "track" | "letters") {
    return this.post<void>(`/career-loop/${resumeId}/cta-click`, { step });
  }

  /** Track has no explicit "mark" call like Share/Letters (it's derived live from job_applications) — call this once the caller has itself confirmed Track just flipped false->true. See worker's CareerLoopService.logTrackStepDone. */
  logTrackDone(resumeId: string) {
    return this.post<void>(`/career-loop/${resumeId}/track-done`, {});
  }
}
