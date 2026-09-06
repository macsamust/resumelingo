import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { adminApi, ApiError } from "../../api";
import { AdminDashboardSummary } from "../../types";
import { ACTION_LABELS } from "./AdminAuditLogPage";

const RANGE_OPTIONS = [7, 30, 90];

const currency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * Trend arrow comparing `current` against the equal-length `previous`
 * period (see AdminDashboardController.summary's doc comment). `invert`
 * flips which direction reads as "good" — a rise in signups is good, a rise
 * in critical security events is not. Renders nothing when both periods are
 * zero, since "no change, still zero" isn't a trend worth stating.
 */
function Trend({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (current === 0 && previous === 0) return null;
  const diff = current - previous;
  if (diff === 0) {
    return <span className="dash-trend dash-trend-flat">flat vs. prior period</span>;
  }
  const up = diff > 0;
  const good = invert ? !up : up;
  const pct = previous > 0 ? Math.round((Math.abs(diff) / previous) * 100) : null;
  return (
    <span className={`dash-trend ${good ? "dash-trend-good" : "dash-trend-bad"}`}>
      {up ? "▲" : "▼"} {Math.abs(diff)}
      {pct !== null ? ` (${pct}%)` : ""} vs. prior period
    </span>
  );
}

/**
 * Admin console's landing page — previously /admin just redirected straight
 * to /admin/users with no aggregate view of the business at all (total
 * users, signups, resume volume). Grew significantly in Sep 2026 after a
 * "make data easy to collect, all in one place" request: revenue/MRR and
 * payment health (previously visible nowhere in admin), a security summary
 * linking to the full Security Report, engagement figures (views, template
 * popularity, Application Tracker adoption), a recent-activity glance pulled
 * from the Audit Log, trend arrows comparing each range-scoped figure
 * against the equal-length period before it, and an "Attention needed"
 * banner up top that only renders when something actually needs a look —
 * so the page reads urgent-first rather than requiring every tile to be
 * read to know whether anything's wrong. Every figure comes from
 * AdminDashboardController.summary, all cheap aggregate queries. The "new in
 * range" tiles were hardcoded to a 7-day window until this page grew a
 * selector — now 7/30/90 days all just refetch with a different `days` param
 * (MRR and Application Tracker adoption aren't range-scoped — see the type's
 * own doc comment for why).
 */
export function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .dashboardSummary(rangeDays)
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load the dashboard."))
      .finally(() => setLoading(false));
  }, [rangeDays]);

  const needsAttention = !!summary && (summary.security.critical > 0 || summary.revenue.paymentFailedCount > 0);

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>Dashboard</h1>
        <div className="admin-page-head-actions">
          <span className="hero-note">New activity window:</span>
          <select value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))}>
            {RANGE_OPTIONS.map((days) => (
              <option key={days} value={days}>
                Last {days} days
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="dashboard-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="dash-tile" key={i} style={{ minHeight: 76 }} />
          ))}
        </div>
      ) : summary ? (
        <>
          {needsAttention && (
            <div className="dash-attention-banner">
              <strong>Needs attention:</strong>
              {summary.security.critical > 0 && (
                <Link to="/admin/security-report">
                  {summary.security.critical} critical security event{summary.security.critical === 1 ? "" : "s"} (last{" "}
                  {summary.rangeDays} days)
                </Link>
              )}
              {summary.revenue.paymentFailedCount > 0 && (
                <Link to="/admin/users">{summary.revenue.paymentFailedCount} account(s) with a failing payment</Link>
              )}
            </div>
          )}

          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            <div className="dash-tile">
              <div className="dash-icon">👥</div>
              <p>{summary.users.total} Total Users</p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">✨</div>
              <p>
                {summary.users.newInRange} New (Last {summary.rangeDays} Days)
              </p>
              <Trend current={summary.users.newInRange} previous={summary.users.newInRangePrevious} />
            </div>
            <div className="dash-tile">
              <div className="dash-icon">⛔</div>
              <p>{summary.users.suspended} Suspended</p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">📄</div>
              <p>{summary.resumes.total} Total Resumes</p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">🆕</div>
              <p>
                {summary.resumes.newInRange} Resumes (Last {summary.rangeDays} Days)
              </p>
              <Trend current={summary.resumes.newInRange} previous={summary.resumes.newInRangePrevious} />
            </div>
          </div>

          <h2 style={{ marginBottom: 16 }}>Plans &amp; revenue</h2>
          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            <div className="dash-tile">
              <div className="dash-icon">💰</div>
              <p>{currency(summary.revenue.mrr)} MRR</p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">🆓</div>
              <p>{summary.users.byTier.starter} Starter</p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">💼</div>
              <p>
                {summary.users.byTier.professional} Professional ({currency(summary.revenue.byTier.professional)})
              </p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">👑</div>
              <p>
                {summary.users.byTier.premium} Premium ({currency(summary.revenue.byTier.premium)})
              </p>
            </div>
            <div className={`dash-tile ${summary.revenue.paymentFailedCount > 0 ? "dash-tile-alert-warning" : ""}`}>
              <div className="dash-icon">⚠️</div>
              <p>{summary.revenue.paymentFailedCount} Payment(s) Failing</p>
            </div>
          </div>

          <h2 style={{ marginBottom: 16 }}>Security</h2>
          <div className="dashboard-grid" style={{ marginBottom: 24 }}>
            <Link
              to="/admin/security-report"
              className={`dash-tile ${summary.security.critical > 0 ? "dash-tile-alert-critical" : ""}`}
            >
              <div className="dash-icon">🚨</div>
              <p>
                {summary.security.critical} Critical (Last {summary.rangeDays} Days)
              </p>
              <Trend current={summary.security.critical} previous={summary.security.previous.critical} invert />
            </Link>
            <Link
              to="/admin/security-report"
              className={`dash-tile ${summary.security.warning > 0 ? "dash-tile-alert-warning" : ""}`}
            >
              <div className="dash-icon">🟡</div>
              <p>
                {summary.security.warning} Warning (Last {summary.rangeDays} Days)
              </p>
              <Trend current={summary.security.warning} previous={summary.security.previous.warning} invert />
            </Link>
            <Link to="/admin/security-report" className="dash-tile">
              <div className="dash-icon">ℹ️</div>
              <p>
                {summary.security.info} Info (Last {summary.rangeDays} Days)
              </p>
              <Trend current={summary.security.info} previous={summary.security.previous.info} invert />
            </Link>
          </div>

          <h2 style={{ marginBottom: 16 }}>Engagement</h2>
          <div className="dashboard-grid" style={{ marginBottom: 16 }}>
            <div className="dash-tile">
              <div className="dash-icon">👁️</div>
              <p>
                {summary.engagement.viewsInRange} Resume Views (Last {summary.rangeDays} Days)
              </p>
              <Trend current={summary.engagement.viewsInRange} previous={summary.engagement.viewsInRangePrevious} />
            </div>
            <div className="dash-tile">
              <div className="dash-icon">🗂️</div>
              <p>{summary.engagement.jobTrackerAdoption} Using Application Tracker</p>
            </div>
          </div>
          {summary.engagement.topTemplates.length > 0 && (
            <div className="dash-rank-card" style={{ marginBottom: 24 }}>
              <p className="hero-note" style={{ marginBottom: 8 }}>
                Most popular templates fleet-wide (Classic excluded)
              </p>
              <ol className="dash-rank-list">
                {summary.engagement.topTemplates.map((t, i) => (
                  <li key={t.templateKey}>
                    <span className="dash-rank-number">{i + 1}</span>
                    <span className="dash-rank-label">{t.templateKey}</span>
                    <span className="dash-rank-count">{t.count} resumes</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <h2 style={{ marginBottom: 16 }}>Recent admin activity</h2>
          {summary.recentActivity.length === 0 ? (
            <p className="hero-note">No admin actions logged yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentActivity.map((entry) => (
                  <tr key={entry.id}>
                    <td className="hero-note">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>{entry.adminEmail}</td>
                    <td>{ACTION_LABELS[entry.action] ?? entry.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hero-note" style={{ marginTop: 8 }}>
            <Link to="/admin/audit-log">View the full Audit Log →</Link>
          </p>
        </>
      ) : null}
    </AdminShell>
  );
}
