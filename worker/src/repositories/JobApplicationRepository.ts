import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { JobApplicationRecord, JobApplicationStatus } from "../types";

export interface CreateJobApplicationInput {
  userId: string;
  resumeId?: string | null;
  company: string;
  role: string;
  status?: JobApplicationStatus;
  appliedDate?: string | null;
  link?: string;
  notes?: string;
}

export interface UpdateJobApplicationInput {
  resumeId?: string | null;
  company?: string;
  role?: string;
  status?: JobApplicationStatus;
  appliedDate?: string | null;
  link?: string;
  notes?: string;
}

export class JobApplicationRepository extends BaseRepository<JobApplicationRecord> {
  protected readonly table = "job_applications";

  /** Newest-updated first, same ordering ResumeRepository.findAllForUser uses for "My Resumes". */
  async findAllForUser(userId: string): Promise<JobApplicationRecord[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM job_applications WHERE "userId" = ? ORDER BY "updatedAt" DESC`)
      .bind(userId)
      .all<JobApplicationRecord>();
    return results;
  }

  /** Backs JobApplicationService's per-user creation cap — unlike resumes, this isn't plan-tiered, just a flat backstop against a runaway client bug or scripted abuse bloating the table. */
  async countForUser(userId: string): Promise<number> {
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM job_applications WHERE "userId" = ?`).bind(userId).first<{ count: number }>();
    return row?.count ?? 0;
  }

  async create(input: CreateJobApplicationInput): Promise<JobApplicationRecord> {
    const now = new Date().toISOString();
    const record: JobApplicationRecord = {
      id: nanoid(12),
      userId: input.userId,
      resumeId: input.resumeId ?? null,
      company: input.company,
      role: input.role,
      status: input.status ?? "applied",
      appliedDate: input.appliedDate ?? null,
      link: input.link ?? "",
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    };
    await this.insertRow(record as unknown as Record<string, unknown>);
    return record;
  }

  async update(id: string, input: UpdateJobApplicationInput): Promise<JobApplicationRecord | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;
    const merged: JobApplicationRecord = {
      ...existing,
      resumeId: input.resumeId !== undefined ? input.resumeId : existing.resumeId,
      company: input.company ?? existing.company,
      role: input.role ?? existing.role,
      status: input.status ?? existing.status,
      appliedDate: input.appliedDate !== undefined ? input.appliedDate : existing.appliedDate,
      link: input.link !== undefined ? input.link : existing.link,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
    };
    await this.updateRow(id, merged as unknown as Record<string, unknown>);
    return merged;
  }

}
