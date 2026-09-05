import { nanoid } from "nanoid";
import { BaseRepository } from "./BaseRepository";
import { JobApplicationRecord, JobApplicationStatus, JobApplicationStatusHistoryEntry } from "../types";

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

  /** Bulk version of delete() — used by JobApplicationService.deleteStale's "clean up old applications" action, batched the same way ResumeRepository.deleteBulk is. Deletes each id's status-history rows first (see delete()'s comment — D1 enforces the foreign key). */
  async deleteBulk(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.batch([
      ...ids.map((id) => this.db.prepare(`DELETE FROM job_application_status_history WHERE "jobApplicationId" = ?`).bind(id)),
      ...ids.map((id) => this.db.prepare(`DELETE FROM job_applications WHERE id = ?`).bind(id)),
    ]);
  }

  /**
   * Overrides BaseRepository.delete() — D1 enforces the foreign key on
   * job_application_status_history.jobApplicationId (see migration 0033's
   * comment), so the history rows have to go first or the parent delete
   * fails outright.
   */
  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM job_application_status_history WHERE "jobApplicationId" = ?`).bind(id).run();
    await super.delete(id);
  }

  /** Records one status change — called from JobApplicationService.create() (the real initial status) and .update() (only when the status actually changed). See migration 0033's doc comment on why an application's history is never backfilled if it already existed before this shipped. */
  async recordStatusChange(jobApplicationId: string, status: JobApplicationStatus, changedAt: string): Promise<void> {
    await this.db
      .prepare(`INSERT INTO job_application_status_history ("id", "jobApplicationId", "status", "changedAt") VALUES (?, ?, ?, ?)`)
      .bind(nanoid(12), jobApplicationId, status, changedAt)
      .run();
  }

  /**
   * Every status-history row across every application this user owns, in
   * one query — used by JobApplicationService.listForUser to attach each
   * application's own timeline without an N+1 (one extra query per
   * application). Ordered oldest-first so callers can group and use as-is
   * without re-sorting.
   */
  async findHistoryForUser(userId: string): Promise<(JobApplicationStatusHistoryEntry & { jobApplicationId: string })[]> {
    const { results } = await this.db
      .prepare(
        `SELECT h."jobApplicationId" as "jobApplicationId", h."status" as "status", h."changedAt" as "changedAt"
         FROM job_application_status_history h
         JOIN job_applications a ON a."id" = h."jobApplicationId"
         WHERE a."userId" = ?
         ORDER BY h."changedAt" ASC`
      )
      .bind(userId)
      .all<JobApplicationStatusHistoryEntry & { jobApplicationId: string }>();
    return results;
  }
}
