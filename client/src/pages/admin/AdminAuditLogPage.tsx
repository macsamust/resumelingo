import { Fragment, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { useToast } from "../../components/common/Toast";
import { adminApi, ApiError } from "../../api";
import { AdminAccount, AdminAuditLogEntry } from "../../types";
import { downloadBlob } from "../../utils/downloadBlob";

const PAGE_SIZE = 50;

/** Human-readable label for each action code logged by the various admin controllers — see worker's AdminAuditLogRepository.log call sites. */
const ACTION_LABELS: Record<string, string> = {
  "user.change_tier": "Changed subscription tier",
  "user.suspend": "Suspended account",
  "user.unsuspend": "Unsuspended account",
  "user.send_password_reset": "Sent password reset email",
  "user.delete": "Deleted account",
  "template.create": "Created template",
  "template.update": "Updated template",
  "template.delete": "Deleted template",
  "plan.update": "Updated plan pricing",
  "admin.create": "Added admin account",
  "admin.delete": "Removed admin account",
  "admin.revoke_sessions": "Signed out of all sessions",
  "admin.totp_enable": "Enabled two factor authentication",
  "admin.totp_disable": "Disabled two factor authentication",
  "user.export_csv": "Exported users to CSV",
  "user.bulk_suspend": "Bulk suspended accounts",
  "user.bulk_unsuspend": "Bulk unsuspended accounts",
  "user.bulk_delete": "Bulk deleted accounts",
  "resume.export_csv": "Exported resumes to CSV",
  "resume.bulk_delete": "Bulk deleted resumes",
  "resume.update": "Edited resume content",
  "resume.delete": "Deleted resume",
};

/**
 * Read-only history of sensitive admin actions — who did what, to what, and
 * when. Previously nothing recorded this at all: suspend, delete, tier
 * change, password reset, and template/plan edits all happened with no
 * trace of which admin did it. Matters the moment there's more than one
 * admin account.
 */
const EMPTY_FILTERS = { adminId: "", action: "", from: "", to: "" };

export function AdminAuditLogPage() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Populates the "Admin" filter dropdown — reuses the same admin roster
  // shown on the Admin Accounts page rather than deriving it from log
  // entries, so an admin who's since been removed still shows by name.
  useEffect(() => {
    adminApi.listAdmins().then((res) => setAdmins(res.admins)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listAuditLog({
        page,
        pageSize: PAGE_SIZE,
        adminId: filters.adminId || undefined,
        action: filters.action || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load the audit log."))
      .finally(() => setLoading(false));
  }, [page, filters]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await adminApi.exportAuditLogCsv({
        adminId: filters.adminId || undefined,
        action: filters.action || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      downloadBlob(blob, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't export the audit log.");
    } finally {
      setExporting(false);
    }
  };

  /**
   * On-demand tamper check (see worker's AdminAuditLogRepository.verifyChainIntegrity)
   * — recomputes the hash chain server-side and reports whether it's intact.
   * Not run automatically (O(n) on table size), just a manual button here.
   */
  const onVerifyIntegrity = async () => {
    setVerifying(true);
    try {
      const result = await adminApi.verifyAuditLogIntegrity();
      if (result.intact) {
        showToast("success", "Audit log integrity verified, no tampering detected.");
      } else {
        showToast("error", `Tampering detected: chain breaks at entry ${result.brokenAt?.id ?? "(unknown)"}.`);
      }
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't verify audit log integrity.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Audit Log <span className="app-page-head-count">({total})</span>
        </h1>
        <div className="admin-page-head-actions">
          <button className="btn btn-ghost btn-sm" type="button" disabled={verifying} onClick={onVerifyIntegrity}>
            {verifying ? "Verifying…" : "Verify integrity"}
          </button>
          <button className="btn btn-ghost btn-sm" type="button" disabled={exporting || total === 0} onClick={onExport}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>
      <div className="admin-audit-filters">
        <select value={filters.adminId} onChange={(e) => updateFilter("adminId", e.target.value)}>
          <option value="">All admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.email})
            </option>
          ))}
        </select>
        <select value={filters.action} onChange={(e) => updateFilter("action", e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className="admin-audit-filter-date">
          From
          <input type="date" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} />
        </label>
        <label className="admin-audit-filter-date">
          To
          <input type="date" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} />
        </label>
        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => {
              setPage(1);
              setFilters(EMPTY_FILTERS);
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <AdminTableSkeleton columns={5} />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Detail</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <Fragment key={e.id}>
                <tr>
                  <td className="hero-note">{new Date(e.createdAt).toLocaleString()}</td>
                  <td>{e.adminEmail}</td>
                  <td>{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td className="hero-note">{e.detail ?? "None"}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                      aria-expanded={expandedId === e.id}
                      aria-label={expandedId === e.id ? "Hide entry details" : "Show entry details"}
                    >
                      {expandedId === e.id ? "▲" : "▼"}
                    </button>
                  </td>
                </tr>
                {expandedId === e.id && (
                  <tr className="admin-expanded-row">
                    <td colSpan={5}>
                      <ul className="admin-audit-detail-list">
                        <li>
                          <span className="hero-note">Entry ID</span> {e.id}
                        </li>
                        <li>
                          <span className="hero-note">Target type</span> {e.targetType}
                        </li>
                        <li>
                          <span className="hero-note">Target ID</span> {e.targetId ?? "None"}
                        </li>
                        <li>
                          <span className="hero-note">Timestamp (UTC)</span> {e.createdAt}
                        </li>
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="hero-note">
                  {hasActiveFilters ? "No admin actions match these filters." : "No admin actions logged yet."}
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
    </AdminShell>
  );
}
