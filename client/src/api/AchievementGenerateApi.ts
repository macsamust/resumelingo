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
export interface AchievementTightenInput {
  professionLabel: string;
  /** Optional — the job the bullets belong to, e.g. "Senior PM, Acme Corp". */
  jobTitle?: string;
  /** The person's own bullets, one string each (max 30 per call, see worker's MAX_TIGHTEN_BULLETS). */
  bullets: string[];
}

export class AchievementGenerateApi extends ApiClient {
  generate(input: AchievementGenerateInput) {
    return this.post<{ achievements: AchievementEntry[] }>("/achievement-generate", input);
  }

  /** POST /api/achievement-generate/tighten — same count and order back; used by PasteBulletsPanel's "Have Poly tighten these". */
  tighten(input: AchievementTightenInput) {
    return this.post<{ bullets: string[] }>("/achievement-generate/tighten", input);
  }
}
