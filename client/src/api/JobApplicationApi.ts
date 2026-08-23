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
  /** limit/warningThreshold/staleCount come from the server (see JobApplicationController.list) so the "approaching the limit"/"clean up old applications" banners can never drift from the server's own cap and 12-month cutoff. */
  list() {
    return this.get<{ applications: JobApplication[]; limit: number; warningThreshold: number; staleCount: number }>("/job-applications");
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

  /** Deletes every application of the current user's over 12 months old — only ever called from the "Clean up old applications" banner after an explicit confirm dialog, never automatically. */
  cleanupStale() {
    return this.post<{ deletedCount: number }>("/job-applications/cleanup-stale");
  }
}
