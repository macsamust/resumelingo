import { ApiClient } from "./ApiClient";
import { ThankYouScenario, ThankYouScenarioOption } from "../types";

export interface GenerateThankYouLetterInput {
  // Required as of the Sep 2026 QA pass — see ThankYouLetterController.generate
  // and ThankYouLetterPage.tsx's disabled-until-filled Generate button. A
  // blank company/role used to still generate a letter with broken wording
  // ("the the role").
  company: string;
  role: string;
  interviewerName?: string;
  scenario: ThankYouScenario;
  topic?: string;
}

export class ThankYouLetterApi extends ApiClient {
  listScenarios() {
    return this.get<{ scenarios: ThankYouScenarioOption[] }>("/thank-you-letters/scenarios");
  }

  generate(input: GenerateThankYouLetterInput) {
    return this.post<{ letter: string }>("/thank-you-letters", input);
  }
}
