import { Link, NavLink } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { TIER_LABEL, TIER_RANK } from "../../utils/templateAccess";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/resumes/new", label: "New Resume" },
  // Professional/Premium only — see JobApplicationService's class comment,
  // which enforces the same restriction server-side, so this is just
  // tidying the nav rather than the actual gate.
  { to: "/job-applications", label: "Job Applications", minTier: "professional" as const },
  // Premium only — see ThankYouLetterPage.tsx/ThankYouLetterController.ts,
  // which enforce the same restriction server-side, so this is just tidying
  // the nav rather than the actual gate.
  { to: "/thank-you-letter", label: "Thank-You Letter", minTier: "premium" as const },
  // Premium only — see CareerCoachPage.tsx/CareerCoachController.ts, which
  // enforce the same restriction server-side, so this is just tidying the
  // nav rather than the actual gate.
  { to: "/career-coach", label: "Career Coach", minTier: "premium" as const },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // "At or above" minTier, not exact-match — a Premium subscriber should
  // still see a "professional"-minTier link like Job Applications, not just
  // someone on Professional exactly.
  const links = LINKS.filter((link) => !link.minTier || (!!user && TIER_RANK[user.subscriptionTier] >= TIER_RANK[link.minTier]));

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        {/* Subscription tier — floats in the sidebar's top-right corner
            (absolutely positioned) rather than sitting in normal flow, so it
            doesn't add height above the nav links or push them down. */}
        {user && <span className="app-sidebar-tier">{TIER_LABEL[user.subscriptionTier]}</span>}
        {/* Subtle "who am I logged in as" reference — visible on every
            logged-in page since AppShell wraps all of them. */}
        {user && (
          <Link to="/profile" className="app-sidebar-user" title="View profile">
            <span className="app-sidebar-user-avatar" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="app-sidebar-user-name">{user.name}</span>
          </Link>
        )}
        <div className="app-sidebar-links">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "")}>
              {link.label}
            </NavLink>
          ))}
        </div>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
