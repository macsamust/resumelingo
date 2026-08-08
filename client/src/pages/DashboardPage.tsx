import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { catalogApi, resumeApi } from "../api";
import { DashboardSummary } from "../types";

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

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

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const { url } = await catalogApi.billingPortal();
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't open the billing portal.");
      setOpeningPortal(false);
    }
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
        <div>
          <h1>{user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}</h1>
          <p className="hero-note">
            <Link to="/profile">View profile</Link>
          </p>
        </div>
        <Link to="/resumes/new" className="btn btn-primary">
          + New Resume
        </Link>
      </div>

      {checkoutStatus === "success" && (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          Subscription updated! It may take a few seconds to reflect below — refresh if needed.
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          Checkout was cancelled — your plan hasn't changed.
        </div>
      )}

      <div className="dashboard-grid" style={{ marginBottom: 12 }}>
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

      <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
        {summary.subscription.tier === "starter" ? (
          <Link to="/#pricing" className="btn btn-ghost">
            Upgrade plan
          </Link>
        ) : (
          <button className="btn btn-ghost" onClick={handleManageBilling} disabled={openingPortal}>
            {openingPortal ? "Opening billing portal…" : "Manage billing"}
          </button>
        )}
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
              <div className="resume-item-tags">
                <span className="visibility-tag">{r.visibility}</span>
                <span className="resume-template-tag">Template: {r.template?.name ?? r.templateKey}</span>
              </div>
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
