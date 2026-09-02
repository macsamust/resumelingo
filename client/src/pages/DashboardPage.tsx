import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ResumeAnalyticsPanel } from "../components/dashboard/ResumeAnalyticsPanel";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { TextPromptDialog } from "../components/common/TextPromptDialog";
import { useToast } from "../components/common/Toast";
import { useAuth } from "../context/AuthContext";
import { catalogApi, resumeApi } from "../api";
import { DashboardSummary } from "../types";
import { RESOURCES as CAREER_RESOURCES } from "../components/marketing/CareerCenter";
import { STORIES as SUCCESS_STORIES } from "../components/marketing/SuccessStories";
import { TOPICS as CAREER_TOPICS } from "./CareerCenterPage";
import { NotificationBell } from "../components/dashboard/NotificationBell";
import { PolyAvatar } from "../components/brand/PolyAvatar";
import { formatRelativeTime } from "../utils/time";

// "Job Search Resources" pulls the topics not already covered by the
// dedicated Resume Tips / Career Articles sections below, so the three
// sections don't just repeat each other.
const JOB_SEARCH_RESOURCE_ANCHORS = ["interview-tips", "salary-negotiation", "networking"];
const CAREER_ARTICLE_IDS = ["career-advice", "promotion-advice", "career-planning", "industry-news"];

export function DashboardPage() {
  const { user, refresh: refreshUser } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  // Set only on the redirect straight from signup (see SignupPage.tsx) —
  // distinguishes a brand-new account's very first dashboard visit from
  // every later one, so it doesn't call a first-time user a "back".
  const isFirstVisit = searchParams.get("welcome") === "1";
  // Which resume (if any) is the subject of a confirm/prompt-style dialog —
  // replaces window.confirm()/window.prompt() with the app's own styled
  // Modal-based dialogs, same pattern as AdminUsersPage.
  const [confirmDeleteResume, setConfirmDeleteResume] = useState<{ id: string; title: string } | null>(null);
  const [cloneSourceResume, setCloneSourceResume] = useState<{ id: string; title: string } | null>(null);

  const isPremium = user?.subscriptionTier === "premium";
  const isProfessional = user?.subscriptionTier === "professional";
  // Total Views and Strength Score are perks of the paid tiers — Starter's
  // dashboard only gets the resume count and plan tiles.
  const showViewsAndStrengthTiles = isProfessional || isPremium;
  // Career Articles and Subscription Management are shared between the
  // Professional and Premium dashboards — Job Search Resources, Resume
  // Tips, and Success Stories stay Premium-only.
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

  // Stripe's webhook (which flips subscriptionTier in our DB) can land a
  // beat after the browser gets redirected back here, so on a successful
  // checkout we re-pull the user rather than relying on the AuthContext
  // snapshot fetched at app load (which would still show the old tier). One
  // retry a few seconds later covers the case where the webhook was still
  // in flight on the first attempt.
  useEffect(() => {
    if (checkoutStatus !== "success") return;
    refreshUser();
    const retry = setTimeout(refreshUser, 4000);
    return () => clearTimeout(retry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStatus]);

  // Closes a resume card's "more actions" menu on any click outside it — the
  // trigger/menu themselves stop propagation (see below) so the same click
  // that opens a menu doesn't immediately close it again.
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const handleDelete = async () => {
    if (!confirmDeleteResume) return;
    try {
      await resumeApi.remove(confirmDeleteResume.id);
      showToast("success", `"${confirmDeleteResume.title}" was deleted.`);
      setConfirmDeleteResume(null);
      load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Couldn't delete this resume.");
    }
  };

  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    try {
      await resumeApi.update(id, { active: !currentlyActive });
      load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Couldn't update this resume's link.");
    }
  };

  const handleClone = async (title: string) => {
    if (!cloneSourceResume) return;
    try {
      await resumeApi.clone(cloneSourceResume.id, { title });
      showToast("success", `Cloned as "${title}".`);
      setCloneSourceResume(null);
      load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Couldn't clone this resume.");
    }
  };

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const { url } = await catalogApi.billingPortal();
      window.location.href = url;
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Couldn't open the billing portal.");
      setOpeningPortal(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <DashboardSkeleton />
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

  // "Most-viewed resume" callout — the one bit of Resume Analytics that
  // wasn't just duplicating what's already on each card (title/views/
  // strength all show there too, see strengthTagClass below).
  const mostViewed = summary.myResumes.reduce<DashboardSummary["myResumes"][number] | null>(
    (best, r) => (r.viewCount > 0 && (!best || r.viewCount > best.viewCount) ? r : best),
    null
  );

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
          <h1>
            {user ? `Welcome${isFirstVisit ? "" : " back"}, ${user.name.split(" ")[0]}` : "Dashboard"}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {summary && <NotificationBell recentViews={summary.recentViews} />}
          <Link to="/resumes/new" className="btn btn-primary">
            + New Resume
          </Link>
        </div>
      </div>

      {checkoutStatus === "success" && (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          Subscription updated! It may take a few seconds to reflect below.
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          Checkout was cancelled. Your plan hasn't changed.
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
            {summary.subscription.planName}:{" "}
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

      <h2 style={{ marginBottom: showViewsAndStrengthTiles && mostViewed ? 4 : 16 }}>My Resumes</h2>
      {showViewsAndStrengthTiles && mostViewed && (
        <p className="hero-note" style={{ marginBottom: 16 }}>
          "{mostViewed.title}" is your most viewed resume, with {mostViewed.viewCount} view
          {mostViewed.viewCount === 1 ? "" : "s"}.
        </p>
      )}
      {summary.myResumes.length === 0 ? (
        <div className="empty-state poly-hero" style={{ marginBottom: isPremium ? 36 : 0 }}>
          <PolyAvatar size={96} />
          <p style={{ margin: 0 }}>
            Hey, I'm Poly. You don't have any resumes yet — let's build your first one.
          </p>
          <Link to="/resumes/new" className="btn btn-primary">
            Create your first resume
          </Link>
        </div>
      ) : (
        <div className="resume-list-grid" style={{ marginBottom: isPremium ? 36 : 0 }}>
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
              <div className="resume-item-header-row">
                <h3>{r.title}</h3>
                <div className="resume-menu">
                  <button
                    className="resume-menu-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId((cur) => (cur === r.id ? null : r.id));
                    }}
                    aria-label="More actions"
                    aria-expanded={openMenuId === r.id}
                  >
                    &#8942;
                  </button>
                  {openMenuId === r.id && (
                    <div className="resume-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                      {(isProfessional || isPremium) && (
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            setCloneSourceResume({ id: r.id, title: r.title });
                          }}
                        >
                          Clone
                        </button>
                      )}
                      <button
                        className="danger"
                        onClick={() => {
                          setOpenMenuId(null);
                          setConfirmDeleteResume({ id: r.id, title: r.title });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="meta">
                {r.professionLabel}
                {showViewsAndStrengthTiles && ` · ${r.viewCount} view${r.viewCount === 1 ? "" : "s"}`}
              </p>
              <p className="meta" style={{ opacity: 0.75 }}>Last updated {formatRelativeTime(r.updatedAt)}</p>
              <div className="resume-item-actions">
                <Link to={`/resumes/${r.id}/edit`} className="btn btn-primary">
                  Edit
                </Link>
                <a href={`/r/${r.slug}`} target="_blank" rel="noreferrer" className="btn btn-ghost">
                  View link
                </a>
              </div>
              {(isProfessional || isPremium) && (
                <div className="resume-active-toggle-row">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={() => handleToggleActive(r.id, r.active)}
                      aria-label={r.active ? "Deactivate this resume link" : "Activate this resume link"}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span className={r.active ? "toggle-status-label active" : "toggle-status-label inactive"}>
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isPremium && summary.resumeAnalytics && (
        <ResumeAnalyticsPanel analytics={summary.resumeAnalytics} />
      )}

      {!isPremium && (
        <div className="builder-panel" style={{ marginTop: 36 }}>
          <h2>{isProfessional ? "Unlock the Premium dashboard" : "Unlock more with Professional and Premium"}</h2>
          <p className="hero-note" style={{ marginBottom: 16 }}>
            {isProfessional
              ? "Premium adds curated job search resources, resume tips, and subscriber success stories."
              : "Professional adds view/strength tracking, career articles, and in dashboard subscription management. Premium adds curated job search resources, resume tips, and subscriber success stories on top of that."}
          </p>
          <Link to="/#pricing" className="btn btn-primary">
            See plans
          </Link>
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
      {cloneSourceResume && (
        <TextPromptDialog
          title="Clone resume"
          message="Give the cloned resume a unique title. This also becomes its public link."
          label="Title"
          defaultValue={`${cloneSourceResume.title} (Copy)`}
          confirmLabel="Clone"
          onSubmit={handleClone}
          onCancel={() => setCloneSourceResume(null)}
        />
      )}
      {confirmDeleteResume && (
        <ConfirmDialog
          title="Delete resume"
          message={`Delete "${confirmDeleteResume.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteResume(null)}
        />
      )}
    </AppShell>
  );
}
