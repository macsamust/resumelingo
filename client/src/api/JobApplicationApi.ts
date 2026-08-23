import { ApiClient } from "./ApiClient";
import { JobApplication, JobApplicationStatus } from "../types";

export interface JobApplicationInput {
  resumeId?: string | null;
  company: string;
  role: string;
  status?: JobApplicationStatus;
  appliedDate?: string | null;
  link?: string;
  notes?: string;
}

export class JobApplicationApi extends ApiClient {
  list() {
    return this.get<{ applications: JobApplication[] }>("/job-applications");
  }

  create(input: JobApplicationInput) {
    return this.post<{ application: JobApplication }>("/job-applications", input);
  }

  update(id: string, input: Partial<JobApplicationInput>) {
    return this.put<{ application: JobApplication }>(`/job-applications/${id}`, input);
  }

  remove(id: string) {
    return this.del<void>(`/job-applications/${id}`);
  }
}
