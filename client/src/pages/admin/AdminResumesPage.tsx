import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminShell } from "../../components/layout/AdminShell";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { adminApi, ApiError } from "../../api";
import { AdminResumeSearchResult } from "../../types";
import { downloadBlob } from "../../utils/downloadBlob";

const PAGE_SIZE = 25;

/**
 * Global, cross-user resume search. Previously the only way to find a
 * specific resume was opening the right user on the Users page and
 * expanding their row — fine if you already know who owns it, useless for
 * a support ticket like "my public resume link is broken" where you only
 * have a title, slug, or the resume owner's email.
 */
export function AdminResumesPage() {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [resumes, setResumes] = useState<AdminResumeSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pre-filled from ?q= when arriving via a link (e.g. AdminResumeEditPage's
  // "find their other resumes"), otherwise starts empty.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected = resumes.length > 0 && resumes.every((r) => selected.has(r.id));

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi
      .searchResumes({ page, pageSize: PAGE_SIZE, q: query.trim() || undefined })
      .then((res) => {
        setResumes(res.resumes);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load resumes."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  const isFirstQueryRun = useRef(true);
  useEffect(() => {
    if (isFirstQueryRun.current) {
      isFirstQueryRun.current = false;
      return;
    }
    const handle = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load();
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Selection is cleared on every reload (new page, new search, or after a
  // bulk action) rather than tracked across pages — keeps "select all" an
  // unambiguous "every row currently on screen" rather than a hidden
  // cross-page state that's easy to lose track of.
  useEffect(() => setSelected(new Set()), [resumes]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      if (allOnPageSelected) return new Set();
      return new Set(resumes.map((r) => r.id));
    });
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportResumesCsv({ q: query.trim() || undefined });
      downloadBlob(blob, `resumes-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't export resumes.");
    } finally {
      setExporting(false);
    }
  };

  const onBulkDelete = async () => {
    setBulkBusy(true);
    try {
      const ids = Array.from(selected);
      const res = await adminApi.bulkDeleteResumes(ids);
      showToast("success", `Deleted ${res.count} resume${res.count === 1 ? "" : "s"}.`);
      setConfirmBulkDelete(false);
      load();
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't delete the selected resumes.");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Resumes <span className="app-page-head-count">({total})</span>
        </h1>
        <div className="admin-page-head-actions">
          <input
            className="admin-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, slug, or owner name/email…"
          />
          <button className="btn btn-ghost btn-sm" type="button" disabled={exporting || total === 0} onClick={onExport}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <span className="hero-note">{selected.size} selected</span>
          <button className="btn btn-ghost btn-sm admin-danger" type="button" onClick={() => setConfirmBulkDelete(true)}>
            Delete selected
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}
      {loading ? (
        <AdminTableSkeleton columns={7} />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  aria-label="Select all resumes on this page"
                />
              </th>
              <th>Title</th>
              <th>Owner</th>
              <th>Template</th>
              <th>Visibility</th>
              <th>Views</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {resumes.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                    aria-label={`Select "${r.title}"`}
                  />
                </td>
                <td>
                  <Link to={`/admin/resumes/${r.id}/edit`}>{r.title}</Link>
                  <br />
                  <span className="hero-note">/{r.slug}</span>
                </td>
                <td>
                  {r.ownerName}
                  <br />
                  <span className="hero-note">{r.ownerEmail}</span>
                </td>
                <td>{r.template?.name ?? r.templateKey}</td>
                <td>
                  <span className={`admin-status-tag ${r.active ? "active" : "suspended"}`}>
                    {r.visibility}
                    {!r.active ? " (paused)" : ""}
                  </span>
                </td>
                <td>{r.viewCount}</td>
                <td>{new Date(r.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {resumes.length === 0 && (
              <tr>
                <td colSpan={7} className="hero-note">
                  {query ? `No resumes match "${query}".` : "No resumes yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {!loading && totalPages > 1 && (
        <div className="admin-pagination">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </button>
          <span className="hero-note">
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </button>
        </div>
      )}
      {confirmBulkDelete && (
        <ConfirmDialog
          title="Delete resumes"
          message={`Permanently delete ${selected.size} resume${selected.size === 1 ? "" : "s"}? This cannot be undone.`}
          confirmLabel={bulkBusy ? "Deleting…" : "Delete"}
          danger
          onConfirm={onBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
    </AdminShell>
  );
}
