import { useEffect, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { adminApi, ApiError } from "../../api";
import { AdminDashboardSummary } from "../../types";

const RANGE_OPTIONS = [7, 30, 90];

/**
 * Admin console's landing page — previously /admin just redirected straight
 * to /admin/users with no aggregate view of the business at all (total
 * users, signups, resume volume). Every figure here comes from
 * AdminDashboardController.summary, all cheap COUNT(*) queries. The "new in
 * range" tiles were hardcoded to a 7-day window until this page grew a
 * selector — now 7/30/90 days all just refetch with a different `days` param.
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
            </div>
          </div>

          <h2 style={{ marginBottom: 16 }}>Users by plan</h2>
          <div className="dashboard-grid">
            <div className="dash-tile">
              <div className="dash-icon">🆓</div>
              <p>{summary.users.byTier.starter} Starter</p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">💼</div>
              <p>{summary.users.byTier.professional} Professional</p>
            </div>
            <div className="dash-tile">
              <div className="dash-icon">👑</div>
              <p>{summary.users.byTier.premium} Premium</p>
            </div>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
