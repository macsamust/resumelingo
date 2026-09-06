import { ApiClient } from "./ApiClient";

export interface GenerateCoverLetterInput {
  resumeId: string;
  companyName?: string;
  roleName?: string;
  hiringManagerName?: string;
}

/** The standalone Cover Letter tool — see worker's CoverLetterController.ts. Nothing here is saved; same "one-off generator" shape as ThankYouLetterApi. */
export class CoverLetterApi extends ApiClient {
  generate(input: GenerateCoverLetterInput) {
    return this.post<{ letter: string }>("/cover-letters", input);
  }
}
