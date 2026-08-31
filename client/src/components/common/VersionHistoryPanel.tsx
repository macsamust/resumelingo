import { useEffect, useState } from "react";
import { resumeApi, ApiError } from "../../api";
import { ResumeVersion } from "../../types";
import { formatRelativeTime } from "../../utils/time";

/**
 * "Version History" section on Edit Resume (Professional/Premium — see
 * ResumeService.assertVersionHistoryAllowed) — a lighter, automatic
 * counterpart to Clone's manual "save a copy." Every non-link-only save
 * snapshots the resume's *pre-save* content (see ResumeService.update), so
 * this lists "how it looked right before each of your last 10 edits" and
 * lets you jump back to any of them.
 *
 * Restoring reloads the page rather than trying to repopulate this page's
 * ~20 separate form fields in place — simpler and safer than duplicating
 * the load effect's field-by-field state population here, at the cost of
 * losing any *unsaved* edits currently in the form (which the confirm
 * dialog below warns about).
 */
export function VersionHistoryPanel({ resumeId }: { resumeId: string }) {
  const [versions, setVersions] = useState<ResumeVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    resumeApi
      .listVersions(resumeId)
      .then((res) => setVersions(res.versions))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load version history."));
  }, [resumeId]);

  const onRestore = async (version: ResumeVersion) => {
    if (
      !confirm(
        `Restore this resume to how it looked ${formatRelativeTime(version.createdAt)}? Any unsaved changes on this page will be lost, and the current version will be saved to history first so you can undo this.`
      )
    ) {
      return;
    }
    setRestoringId(version.id);
    setError(null);
    try {
      await resumeApi.restoreVersion(resumeId, version.id);
      window.location.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't restore that version.");
      setRestoringId(null);
    }
  };

  if (error) return <p className="form-error">{error}</p>;
  if (!versions) return <p className="hero-note">Loading version history…</p>;
  if (versions.length === 0) {
    return <p className="hero-note">No past versions yet. One is saved automatically every time you edit and save this resume.</p>;
  }

  return (
    <ul className="version-history-list">
      {versions.map((v) => (
        <li key={v.id}>
          <div>
            <span className="version-history-title">{v.snapshot.title}</span>
            <span className="hero-note">{formatRelativeTime(v.createdAt)}</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" disabled={restoringId === v.id} onClick={() => onRestore(v)}>
            {restoringId === v.id ? "Restoring…" : "Restore"}
          </button>
        </li>
      ))}
    </ul>
  );
}
