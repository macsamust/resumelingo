import { ApiClient } from "./ApiClient";
import { AchievementEntry } from "../types";

export interface AchievementGenerateInput {
  professionLabel: string;
  /** Optional — e.g. "Senior Backend Engineer at Acme Corp". */
  jobTitle?: string;
  /** Free text — comma or newline separated keywords/rough phrases. */
  keywords: string;
}

/**
 * POST /api/achievement-generate — see worker's AchievementGenerateController/
 * AchievementGeneratorService. Professional/Premium-gated, same tier as
 * Resume Import. Used by AchievementGeneratorPanel.tsx's "Not sure what to
 * write?" option inside the Highlights & Key Achievements section.
 */
export class AchievementGenerateApi extends ApiClient {
  generate(input: AchievementGenerateInput) {
    return this.post<{ achievements: AchievementEntry[] }>("/achievement-generate", input);
  }
}
