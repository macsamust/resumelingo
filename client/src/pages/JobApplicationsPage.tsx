import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { useToast } from "../components/common/Toast";
import { useAuth } from "../context/AuthContext";
import { ApiError, jobApplicationApi, resumeApi } from "../api";
import { JobApplication, JobApplicationStatus, Resume } from "../types";

const STATUS_LABEL: Record<JobApplicationStatus, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};
const STATUSES = Object.keys(STATUS_LABEL) as JobApplicationStatus[];

const EMPTY_NEW = { company: "", role: "", resumeId: "", status: "applied" as JobApplicationStatus, appliedDate: "", link: "" };

type Draft = { company: string; role: string; resumeId: string; status: JobApplicationStatus; appliedDate: string; link: string; notes: string };

/**
 * Only renders the "job posting link" field as a clickable href when it's
 * actually http(s) — the field is free text the user types themselves, so
 * without this check a pasted (or mistyped) "javascript:..." value would
 * execute on click instead of navigating anywhere. Returns null for
 * anything else, so callers can just skip rendering the link.
 */
function safeExternalHref(link: string): string | null {
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function toDraft(a: JobApplication): Draft {
  return {
    company: a.company,
    role: a.role,
    resumeId: a.resumeId ?? "",
    status: a.status,
    appliedDate: a.appliedDate ?? "",
    link: a.link,
    notes: a.notes,
  };
}

function JobApplicationsLocked() {
  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Job Applications</h1>
      </div>
      <div className="empty-state">
        <p>Job application tracking is a Professional/Premium feature. Upgrade your plan to start tracking where you've applied.</p>
        <Link to="/dashboard" className="btn btn-primary">
          Upgrade my plan
        </Link>
      </div>
    </AppShell>
  );
}

/**
 * Job application tracker — where a resume was actually sent, and what
 * happened after. Sits alongside Clone ("save a copy of this resume for a
 * new target role") as the missing other half: Clone answers "which resume
 * did I make for this?", this answers "did I ever hear back?".
 * Professional/Premium only (see JobApplicationService's class comment) —
 * server-enforced on every route, this is just the same "don't show a
 * Starter subscriber a form that will 402" treatment CareerCoachPage.tsx
 * gives Career Coach.
 */
export function JobApplicationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newApp, setNewApp] = useState(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, Draft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<JobApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | JobApplicationStatus>("all");
  // limit/warningThreshold/staleCount all come from the server (see
  // JobApplicationController.list) rather than being hardcoded here, so the
  // banners below can never drift from the server's own cap/cutoff.
  const [limit, setLimit] = useState<number | null>(null);
  const [warningThreshold, setWarningThreshold] = useState<number | null>(null);
  const [staleCount, setStaleCount] = useState(0);
  const [confirmingCleanup, setConfirmingCleanup] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([jobApplicationApi.list(), resumeApi.list()])
      .then(([appsRes, resumesRes]) => {
        setApplications(appsRes.applications);
        setResumes(resumesRes.resumes);
        setLimit(appsRes.limit);
        setWarningThreshold(appsRes.warningThreshold);
        setStaleCount(appsRes.staleCount);
        const nextEditing: Record<string, Draft> = {};
        appsRes.applications.forEach((a) => (nextEditing[a.id] = toDraft(a)));
        setEditing(nextEditing);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your applications."))
      .finally(() => setLoading(false));
  };

  // Skips the fetch entirely for a Starter subscriber — the server would
  // just 402 it, and the locked-state return below never renders anything
  // that needs this data anyway.
  useEffect(() => {
    if (user && user.subscriptionTier === "starter") return;
    load();
  }, [user]);

  if (user && user.subscriptionTier === "starter") return <JobApplicationsLocked />;

  const resumeTitle = (resumeId: string | null) => resumes.find((r) => r.id === resumeId)?.title;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newApp.company.trim() || !newApp.role.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await jobApplicationApi.create({
        company: newApp.company.trim(),
        role: newApp.role.trim(),
        resumeId: newApp.resumeId || null,
        status: newApp.status,
        appliedDate: newApp.appliedDate || null,
        link: newApp.link.trim(),
      });
      setNewApp(EMPTY_NEW);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add that application.");
    } finally {
      setCreating(false);
    }
  };

  /** Status is the one field that changes often without opening the row — saved immediately on change rather than waiting for the row's own "Save changes" click. */
  const onStatusChange = async (a: JobApplication, status: JobApplicationStatus) => {
    setEditing((prev) => ({ ...prev, [a.id]: { ...prev[a.id], status } }));
    setBusyId(a.id);
    try {
      await jobApplicationApi.update(a.id, { status });
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't update status.");
    } finally {
      setBusyId(null);
    }
  };

  const onSave = async (id: string) => {
    const draft = editing[id];
    if (!draft.company.trim() || !draft.role.trim()) return;
    setBusyId(id);
    try {
      await jobApplicationApi.update(id, {
        company: draft.company.trim(),
        role: draft.role.trim(),
        resumeId: draft.resumeId || null,
        status: draft.status,
        appliedDate: draft.appliedDate || null,
        link: draft.link.trim(),
        notes: draft.notes,
      });
      showToast("success", "Saved.");
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't save that application.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    const a = confirmDelete;
    setBusyId(a.id);
    try {
      await jobApplicationApi.remove(a.id);
      showToast("success", `${a.role} at ${a.company} removed.`);
      setConfirmDelete(null);
      if (expandedId === a.id) setExpandedId(null);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't remove that application.");
    } finally {
      setBusyId(null);
    }
  };

  /** "Clean up old applications" — only ever runs after the confirm dialog below; the server recomputes which applications are actually over 12 months old itself rather than trusting a client-supplied list (see JobApplicationService.deleteStale). Never automatic. */
  const onCleanupStale = async () => {
    setCleaningUp(true);
    try {
      const { deletedCount } = await jobApplicationApi.cleanupStale();
      showToast("success", `Removed ${deletedCount} application${deletedCount === 1 ? "" : "s"} older than 12 months.`);
      setConfirmingCleanup(false);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't clean up old applications.");
    } finally {
      setCleaningUp(false);
    }
  };

  const visible = statusFilter === "all" ? applications : applications.filter((a) => a.status === statusFilter);
  const nearLimit = limit !== null && warningThreshold !== null && applications.length >= warningThreshold;
  const atLimit = limit !== null && applications.length >= limit;

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Job Applications</h1>
        <span className="app-page-head-count">
          {applications.length}
          {limit !== null ? ` / ${limit}` : ""} tracked
        </span>
      </div>
      <p className="hero-note" style={{ marginBottom: 20 }}>
        Track which resume you sent where, and what happened after — Clone a resume per target role, then log the
        application here to keep it all in one place.
      </p>
      {error && <div className="form-error">{error}</div>}

      {nearLimit && (
        <div className={`job-app-banner ${atLimit ? "job-app-banner-limit" : "job-app-banner-warning"}`}>
          {atLimit
            ? `You've reached the ${limit}-application limit — remove one (or clean up old ones below) before adding another.`
            : `You're at ${applications.length} of ${limit} tracked applications — worth cleaning up old ones before you hit the limit.`}
        </div>
      )}

      {staleCount > 0 && (
        <div className="job-app-banner">
          <span>
            {staleCount} application{staleCount === 1 ? " is" : "s are"} older than 12 months — probably safe to clean up.
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingCleanup(true)}>
            Clean up old applications
          </button>
        </div>
      )}

      <form className="admin-new-template" onSubmit={onCreate} style={{ marginBottom: 24 }}>
        <h2>Log an application</h2>
        <div className="job-app-form-row">
          <div className="field">
            <label>Company</label>
            <input value={newApp.company} onChange={(e) => setNewApp({ ...newApp, company: e.target.value })} required />
          </div>
          <div className="field">
            <label>Role</label>
            <input value={newApp.role} onChange={(e) => setNewApp({ ...newApp, role: e.target.value })} required />
          </div>
          <div className="field">
            <label>Resume used</label>
            <select value={newApp.resumeId} onChange={(e) => setNewApp({ ...newApp, resumeId: e.target.value })}>
              <option value="">(none)</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="job-app-form-row">
          <div className="field">
            <label>Status</label>
            <select value={newApp.status} onChange={(e) => setNewApp({ ...newApp, status: e.target.value as JobApplicationStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Applied on</label>
            <input type="date" value={newApp.appliedDate} onChange={(e) => setNewApp({ ...newApp, appliedDate: e.target.value })} />
          </div>
          <div className="field">
            <label>Job posting link</label>
            <input value={newApp.link} onChange={(e) => setNewApp({ ...newApp, link: e.target.value })} placeholder="https://…" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add application"}
        </button>
      </form>

      {!loading && applications.length > 0 && (
        <div className="field" style={{ maxWidth: 260, marginBottom: 12 }}>
          <label>Filter by status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | JobApplicationStatus)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="hero-note">Loading…</p>
      ) : applications.length === 0 ? (
        <p className="hero-note">No applications logged yet — add one above once you've sent a resume out.</p>
      ) : (
        <div className="job-app-list">
          {visible.map((a) => {
            const draft = editing[a.id] ?? toDraft(a);
            const expanded = expandedId === a.id;
            const href = a.link ? safeExternalHref(a.link) : null;
            return (
              <div className="resume-card job-app-card" key={a.id}>
                <div className="job-app-card-head">
                  <div>
                    <h3>
                      {a.role} <span className="hero-note">at</span> {a.company}
                    </h3>
                    <p className="hero-note">
                      {resumeTitle(a.resumeId) ? `Sent with "${resumeTitle(a.resumeId)}"` : "No resume linked"}
                      {a.appliedDate ? ` · Applied ${a.appliedDate}` : ""}
                      {href && (
                        <>
                          {" · "}
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            View posting ↗
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="job-app-card-actions">
                    <select
                      className={`job-app-status job-app-status-${a.status}`}
                      value={a.status}
                      disabled={busyId === a.id}
                      onChange={(e) => onStatusChange(a, e.target.value as JobApplicationStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpandedId(expanded ? null : a.id)}>
                      {expanded ? "Close" : "Edit"}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm admin-danger" onClick={() => setConfirmDelete(a)}>
                      Delete
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="job-app-card-body">
                    <div className="job-app-form-row">
                      <div className="field">
                        <label>Company</label>
                        <input value={draft.company} onChange={(e) => setEditing({ ...editing, [a.id]: { ...draft, company: e.target.value } })} />
                      </div>
                      <div className="field">
                        <label>Role</label>
                        <input value={draft.role} onChange={(e) => setEditing({ ...editing, [a.id]: { ...draft, role: e.target.value } })} />
                      </div>
                      <div className="field">
                        <label>Resume used</label>
                        <select value={draft.resumeId} onChange={(e) => setEditing({ ...editing, [a.id]: { ...draft, resumeId: e.target.value } })}>
                          <option value="">(none)</option>
                          {resumes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="job-app-form-row">
                      <div className="field">
                        <label>Applied on</label>
                        <input
                          type="date"
                          value={draft.appliedDate}
                          onChange={(e) => setEditing({ ...editing, [a.id]: { ...draft, appliedDate: e.target.value } })}
                        />
                      </div>
                      <div className="field">
                        <label>Job posting link</label>
                        <input value={draft.link} onChange={(e) => setEditing({ ...editing, [a.id]: { ...draft, link: e.target.value } })} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Notes</label>
                      <textarea
                        rows={3}
                        value={draft.notes}
                        onChange={(e) => setEditing({ ...editing, [a.id]: { ...draft, notes: e.target.value } })}
                        placeholder="Interviewer names, recruiter contact, next steps…"
                      />
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" disabled={busyId === a.id} onClick={() => onSave(a.id)}>
                      {busyId === a.id ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Remove application"
          message={`Remove ${confirmDelete.role} at ${confirmDelete.company} from your tracker? This can't be undone.`}
          confirmLabel="Remove"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmingCleanup && (
        <ConfirmDialog
          title="Clean up old applications"
          message={`Remove ${staleCount} application${staleCount === 1 ? "" : "s"} older than 12 months (based on when it was applied, or logged if no date was set)? This can't be undone.`}
          confirmLabel={cleaningUp ? "Removing…" : "Remove them"}
          danger
          onConfirm={onCleanupStale}
          onCancel={() => setConfirmingCleanup(false)}
        />
      )}
    </AppShell>
  );
}
