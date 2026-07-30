import { ApiClient } from "./ApiClient";
import { LinkVisibility, Resume } from "../types";

export interface CreateResumeInput {
  title: string;
  profession: string;
  templateKey: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
  answers: Record<string, string>;
}

export class ResumeApi extends ApiClient {
  list() {
    return this.get<{ resumes: Resume[] }>("/resumes");
  }

  getById(id: string) {
    return this.get<{ resume: Resume }>(`/resumes/${id}`);
  }

  create(input: CreateResumeInput) {
    return this.post<{ resume: Resume }>("/resumes", input);
  }

  update(id: string, input: Partial<CreateResumeInput>) {
    return this.put<{ resume: Resume }>(`/resumes/${id}`, input);
  }

  remove(id: string) {
    return this.del<void>(`/resumes/${id}`);
  }
}
