import { ApiClient } from "./ApiClient";
import { AchievementEntry, AwardEntry, EducationEntry, LinkVisibility, Resume, WorkExperienceEntry } from "../types";

export interface CreateResumeInput {
  fullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  photoUrl?: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility?: LinkVisibility;
  accessPassword?: string | null;
  accessPasswordExpiresAt?: string | null;
  coverLetterEnabled?: boolean;
  /** "Recruiter Mode" toggle — only takes effect server-side for Premium subscribers (see ResumeService.update). */
  recruiterModeEnabled?: boolean;
  recruiterLocation?: string;
  recruiterAvailability?: string;
  recruiterClearance?: string;
  recruiterWorkAuthorization?: string;
  recruiterExpectedSalary?: string;
  recruiterRemotePreference?: string;
  /** "Combine Work Experience with Achievements" toggle — see types/index.ts Resume.combineExperienceFormat. Not tier-gated. */
  combineExperienceFormat?: boolean;
  answers: Record<string, string>;
  experience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  awards?: AwardEntry[];
  achievements?: AchievementEntry[];
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
