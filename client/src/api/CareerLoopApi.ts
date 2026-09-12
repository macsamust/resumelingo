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
}
