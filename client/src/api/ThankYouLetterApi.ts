import { ApiClient } from "./ApiClient";
import { ThankYouScenario, ThankYouScenarioOption } from "../types";

export interface GenerateThankYouLetterInput {
  company?: string;
  role?: string;
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
