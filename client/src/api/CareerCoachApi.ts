import { ApiClient } from "./ApiClient";

export type CareerCoachTopic = "salary" | "interview" | "certifications" | "general";

export interface CareerCoachAnswer {
  topic: CareerCoachTopic;
  answer: string;
  relatedLinks: { label: string; anchor: string }[];
}

export class CareerCoachApi extends ApiClient {
  ask(question: string) {
    return this.post<CareerCoachAnswer>("/career-coach/ask", { question });
  }
}
