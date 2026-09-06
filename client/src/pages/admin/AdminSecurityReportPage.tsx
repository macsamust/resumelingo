import { Fragment, useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { AdminTableSkeleton } from "../../components/admin/AdminTableSkeleton";
import { adminApi, ApiError } from "../../api";
import { SecurityEvent } from "../../types";

const PAGE_SIZE = 50;

/** Human-readable label per SecurityEventType — kept in sync with worker's EmailService.securityEventLabel, which uses the same labels in alert/digest emails. */
const TYPE_LABELS: Record<string, string> = {
  login_brute_force: "Repeated failed logins",
  register_burst: "Registration burst",
  verify_brute_force: "Repeated failed email verification attempts",
  resend_spam: "Verification email resend spam",
  password_reset_spam: "Password reset request spam",
  public_resume_password_guessing: "Public resume password guessing",
  admin_login_brute_force: "Repeated failed admin logins",
  admin_mass_delete: "Unusual volume of admin deletes",
};

const SEVERITY_LABELS: Record<string, string> = { critical: "Critical", warning: "Warning", info: "Info" };

const EMPTY_FILTERS = { type: "", severity: "", from: "", to: "" };

/**
 * Read-only history of flagged abuse/anomaly signals — see worker's
 * SecurityEventRepository/SecurityAlertService (real-time, when an existing
 * IP-throttle trips) and SecurityMonitorService (daily, for admin-audit-log
 * anomalies). Threshold-based heuristics against known abuse patterns, not
 * machine-learning anomaly detection — the drill-down surface for the
 * immediate/daily email alerts, not the primary notification itself.
 */
export function AdminSecurityReportPage() {
  const [entries, setEntries] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilters = Object.values(filters).some(Boolean);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .listSecurityEvents({
        page,
        pageSize: PAGE_SIZE,
        type: filters.type || undefined,
        severity: filters.severity || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      })
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load the security report."))
      .finally(() => setLoading(false));
  }, [page, filters]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const parsedDetail = (detail: string | null): Record<string, unknown> | null => {
    if (!detail) return null;
    try {
      return JSON.parse(detail);
    } catch {
      return null;
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Security Report <span className="app-page-head-count">({total})</span>
        </h1>
      </div>
      <p className="hero-note admin-plan-warning">
        Threshold-based abuse/anomaly signals — login and admin-login brute force, registration bursts, password
        reset/verification spam, public resume password guessing, and unusual admin delete volume. This is
        heuristic detection against known abuse patterns, not machine-learning anomaly detection. Critical events
        also send an immediate email; everything else rolls into a once-daily summary email.
      </p>
      {error && <div className="form-error">{error}</div>}
      <div className="admin-audit-filters">
        <select value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select value={filters.severity} onChange={(e) => updateFilter("severity", e.target.value)}>
          <option value="">All severities</option>
          {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
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
      {loading ? (
        <AdminTableSkeleton columns={5} />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Severity</th>
              <th>IP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <Fragment key={e.id}>
                <tr>
                  <td className="hero-note">{new Date(e.createdAt).toLocaleString()}</td>
                  <td>{TYPE_LABELS[e.type] ?? e.type}</td>
                  <td>
                    <span className={`admin-severity-badge admin-severity-${e.severity}`}>{SEVERITY_LABELS[e.severity] ?? e.severity}</span>
                  </td>
                  <td className="hero-note">{e.ip ?? "None"}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                      aria-expanded={expandedId === e.id}
                      aria-label={expandedId === e.id ? "Hide event details" : "Show event details"}
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
                          <span className="hero-note">Event ID</span> {e.id}
                        </li>
                        {Object.entries(parsedDetail(e.detail) ?? {}).map(([key, value]) => (
                          <li key={key}>
                            <span className="hero-note">{key}</span> {String(value)}
                          </li>
                        ))}
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
                  {hasActiveFilters ? "No security events match these filters." : "No security events logged yet."}
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
