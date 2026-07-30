import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { catalogApi, resumeApi } from "../api";
import { DashboardSummary } from "../types";

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    catalogApi
      .dashboardSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resume? This cannot be undone.")) return;
    await resumeApi.remove(id);
    load();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="spinner-page">Loading your dashboard…</div>
      </AppShell>
    );
  }

  if (!summary) {
    return (
      <AppShell>
        <div className="empty-state">Couldn't load your dashboard. Is the API server running?</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="app-page-head">
        <h1>Dashboard</h1>
        <Link to="/resumes/new" className="btn btn-primary">
          + New Resume
        </Link>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: 36 }}>
        <div className="dash-tile">
          <div className="dash-icon">📁</div>
          <p>{summary.myResumes.length} Resume{summary.myResumes.length === 1 ? "" : "s"}</p>
        </div>
        <div className="dash-tile">
          <div className="dash-icon">👀</div>
          <p>{summary.resumeViews} Total Views</p>
        </div>
        <div className="dash-tile">
          <div className="dash-icon">💪</div>
          <p>{summary.profileStrengthScore}% Strength Score</p>
        </div>
        <div className="dash-tile">
          <div className="dash-icon">⚙️</div>
          <p>
            {summary.subscription.planName} —{" "}
            {summary.subscription.unlimited ? "Unlimited" : `${summary.subscription.remaining} left`}
          </p>
        </div>
      </div>

      {summary.suggestedImprovements.length > 0 && (
        <div className="builder-panel" style={{ marginBottom: 36 }}>
          <h2>Suggested Improvements</h2>
          <ul className="preview-bullets">
            {summary.suggestedImprovements.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 style={{ marginBottom: 16 }}>My Resumes</h2>
      {summary.myResumes.length === 0 ? (
        <div className="empty-state">
          You don't have any resumes yet. <Link to="/resumes/new">Create your first one</Link>.
        </div>
      ) : (
        <div className="resume-list-grid">
          {summary.myResumes.map((r) => (
            <div className="resume-item-card" key={r.id}>
              <span className="visibility-tag">{r.visibility}</span>
              <h3>{r.title}</h3>
              <p className="meta">
                {r.professionLabel} · {r.viewCount} view{r.viewCount === 1 ? "" : "s"}
              </p>
              <div className="resume-item-actions">
                <Link to={`/resumes/${r.id}/edit`} className="btn btn-ghost">
                  Edit
                </Link>
                <a href={`/r/${r.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
                  View link
                </a>
                <button className="btn btn-ghost" onClick={() => handleDelete(r.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
