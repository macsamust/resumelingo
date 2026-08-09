import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { catalogApi, resumeApi } from "../api";
import { DashboardSummary } from "../types";
import { RESOURCES as CAREER_RESOURCES } from "../components/marketing/CareerCenter";
import { STORIES as SUCCESS_STORIES } from "../components/marketing/SuccessStories";
import { TOPICS as CAREER_TOPICS } from "./CareerCenterPage";

// "Job Search Resources" pulls the topics not already covered by the
// dedicated Resume Tips / Career Articles sections below, so the three
// sections don't just repeat each other.
const JOB_SEARCH_RESOURCE_ANCHORS = ["interview-tips", "salary-negotiation", "networking"];
const CAREER_ARTICLE_IDS = ["career-advice", "promotion-advice", "career-planning", "industry-news"];

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const isPremium = user?.subscriptionTier === "premium";
  const isProfessional = user?.subscriptionTier === "professional";
  // Total Views and Strength Score are perks of the paid tiers — Starter's
  // dashboard only gets the resume count and plan tiles.
  const showViewsAndStrengthTiles = isProfessional || isPremium;
  // Shared Links, Resume Analytics, Career Articles, and Subscription
  // Management are shared between the Professional and Premium dashboards —
  // Job Search Resources, Resume Tips, and Success Stories stay Premium-only.
  const showSharedLinks = isProfessional || isPremium;
  const showResumeAnalytics = isProfessional || isPremium;
  const showCareerArticles = isProfessional || isPremium;
  const showSubscriptionManagement = isProfessional || isPremium;

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

  const handleCopyLink = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${slug}`);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug((cur) => (cur === slug ? null : cur)), 2000);
    } catch {
      alert("Couldn't copy the link — you can still open it directly.");
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

  // Lightweight "Resume Analytics" — a per-resume breakdown of the existing
  // view counter, no new backend tracking involved.
  const resumesByViews = [...summary.myResumes].sort((a, b) => b.viewCount - a.viewCount);
  const mostViewed = resumesByViews.find((r) => r.viewCount > 0) ?? null;

  // Color-coded threshold for the "My Resumes" card strength tag — matches
  // the green/amber/red bands already used for ATS Check pass/fail styling.
  const strengthTagClass = (score: number): string => {
    if (score >= 80) return "strength-tag-high";
    if (score >= 50) return "strength-tag-medium";
    return "strength-tag-low";
  };

  const jobSearchResources = CAREER_RESOURCES.filter((r) => JOB_SEARCH_RESOURCE_ANCHORS.includes(r.anchor));
  const resumeTipsTopic = CAREER_TOPICS.find((t) => t.id === "resume-tips");
  const careerArticles = CAREER_TOPICS.filter((t) => CAREER_ARTICLE_IDS.includes(t.id));

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
        {showViewsAndStrengthTiles && (
          <div className="dash-tile">
            <div className="dash-icon">👀</div>
            <p>{summary.resumeViews} Total Views</p>
          </div>
        )}
        {showViewsAndStrengthTiles && (
          <div className="dash-tile">
            <div className="dash-icon">💪</div>
            <p>{summary.profileStrengthScore}% Strength Score</p>
          </div>
        )}
        <div className="dash-tile">
          <div className="dash-icon">⚙️</div>
          <p>
            {summary.subscription.planName} —{" "}
            {summary.subscription.unlimited ? "Unlimited" : `${summary.subscription.remaining} left`}
          </p>
        </div>
      </div>

      {!showSubscriptionManagement && (
        <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
          <Link to="/#pricing" className="btn btn-ghost">
            Upgrade plan
          </Link>
        </div>
      )}

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
                {showViewsAndStrengthTiles && (
                  <span className={`resume-template-tag ${strengthTagClass(r.strengthScore)}`}>
                    Strength {r.strengthScore}%
                  </span>
                )}
              </div>
              <h3>{r.title}</h3>
              <p className="meta">
                {r.professionLabel}
                {showViewsAndStrengthTiles && ` · ${r.viewCount} view${r.viewCount === 1 ? "" : "s"}`}
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

      {!isPremium && (
        <div className="builder-panel" style={{ marginTop: 36 }}>
          <h2>{isProfessional ? "Unlock the Premium dashboard" : "Unlock more with Professional and Premium"}</h2>
          <p className="hero-note" style={{ marginBottom: 16 }}>
            {isProfessional
              ? "Premium adds curated job search resources, resume tips, and subscriber success stories."
              : "Professional adds a shared-links overview, resume analytics, career articles, and in-dashboard subscription management. Premium adds curated job search resources, resume tips, and subscriber success stories on top of that."}
          </p>
          <Link to="/#pricing" className="btn btn-primary">
            See plans
          </Link>
        </div>
      )}

      {showResumeAnalytics && (
        <div className="builder-panel" style={{ marginTop: 36, marginBottom: 36 }}>
          <h2>Resume Analytics</h2>
          <p className="hero-note" style={{ marginBottom: 16 }}>
            {mostViewed
              ? `"${mostViewed.title}" is your most-viewed resume, with ${mostViewed.viewCount} view${mostViewed.viewCount === 1 ? "" : "s"}.`
              : "No views yet — share a resume link to start seeing views here."}
          </p>
          {summary.myResumes.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Resume</th>
                  <th>Views</th>
                  <th>Strength</th>
                </tr>
              </thead>
              <tbody>
                {resumesByViews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.viewCount}</td>
                    <td>{r.strengthScore}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showSharedLinks && (
        <div className="builder-panel" style={{ marginTop: showResumeAnalytics ? 0 : 36, marginBottom: 36 }}>
          <h2>Shared Links</h2>
          {summary.sharedLinks.length === 0 ? (
            <p className="hero-note">No shared links yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Resume</th>
                  <th>Visibility</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {summary.sharedLinks.map((link) => (
                  <tr key={link.slug}>
                    <td>{link.title}</td>
                    <td>
                      <span className="visibility-tag">{link.visibility}</span>
                    </td>
                    <td className="admin-row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleCopyLink(link.slug)}>
                        {copiedSlug === link.slug ? "Copied!" : "Copy link"}
                      </button>
                      <a href={`/r/${link.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isPremium && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 16 }}>Job Search Resources</h2>
          <div className="resources-grid">
            {jobSearchResources.map((r) => (
              <Link to={`/career-center#${r.anchor}`} className="resource-card" key={r.title}>
                <span className="resource-tag">{r.tag}</span>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isPremium && resumeTipsTopic && (
        <div className="builder-panel" style={{ marginBottom: 36 }}>
          <h2>Resume Tips</h2>
          <ul className="preview-bullets">
            {resumeTipsTopic.tips.slice(0, 4).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
          <Link to={`/career-center#${resumeTipsTopic.id}`} className="btn btn-ghost" style={{ marginTop: 12 }}>
            Read the full guide
          </Link>
        </div>
      )}

      {showCareerArticles && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 16 }}>Career Articles</h2>
          <div className="resources-grid">
            {careerArticles.map((topic) => (
              <Link to={`/career-center#${topic.id}`} className="resource-card" key={topic.id}>
                <span className="resource-tag">{topic.title}</span>
                <h3>{topic.title}</h3>
                <p>{topic.intro}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isPremium && (
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ marginBottom: 16 }}>Success Stories</h2>
          <div className="stories-grid">
            {SUCCESS_STORIES.map((s) => (
              <div className="story-card" key={s.name}>
                <p className="story-quote">"{s.quote}"</p>
                <div className="story-person">
                  <div className="story-avatar">{s.initial}</div>
                  <div>
                    <p>{s.name}</p>
                    <p>{s.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSubscriptionManagement && user && (
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ marginBottom: 16 }}>Subscription Management</h2>
          <div className="price-card" style={{ maxWidth: 380 }}>
            <div className="price-tier">{user.plan.name}</div>
            <h3>{user.plan.name} plan</h3>
            <div className="price-amount">
              {user.plan.priceMonthly === 0 ? "$0" : `$${user.plan.priceMonthly}`}
              {user.plan.priceMonthly > 0 && <span className="per">/month</span>}
            </div>
            <p className="price-desc">
              {summary.subscription.unlimited
                ? "Unlimited resumes"
                : `${summary.subscription.resumesUsed} of ${summary.subscription.resumeLimit} resumes used`}
            </p>
            <ul className="price-list">
              {user.plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button className="btn btn-block btn-ghost" onClick={handleManageBilling} disabled={openingPortal}>
              {openingPortal ? "Opening billing portal…" : "Manage billing"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
