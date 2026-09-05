import { Link, NavLink } from "react-router-dom";
import { ReactNode, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { TIER_LABEL, TIER_RANK } from "../../utils/templateAccess";
import { authApi, ApiError } from "../../api";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/resumes/new", label: "New Resume" },
  // Professional/Premium only — see JobApplicationService's class comment,
  // which enforces the same restriction server-side, so this is just
  // tidying the nav rather than the actual gate.
  { to: "/job-applications", label: "Application Tracker", minTier: "professional" as const },
  // Premium only — see ThankYouLetterPage.tsx/ThankYouLetterController.ts,
  // which enforce the same restriction server-side, so this is just tidying
  // the nav rather than the actual gate.
  { to: "/thank-you-letter", label: "Thank-You Letter", minTier: "premium" as const },
  // Premium only — see CareerCoachPage.tsx/CareerCoachController.ts, which
  // enforce the same restriction server-side, so this is just tidying the
  // nav rather than the actual gate.
  { to: "/career-coach", label: "Ask Poly", minTier: "premium" as const },
];

/**
 * Dismissible-per-session nudge for an unverified email — doesn't gate
 * anything (see migration 0017's comment: "track + nudge only", not an
 * access-control change). Dismissal isn't persisted anywhere; it just hides
 * for the rest of this page load, same as most banners of this kind.
 */
function VerifyEmailBanner() {
  const { refresh } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  const onResend = async () => {
    setError(null);
    setSending(true);
    try {
      await authApi.resendVerification();
      setSent(true);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong sending that email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-banner app-banner-notice">
      <span>
        {sent
          ? "Verification email sent. Check your inbox."
          : "Please verify your email address. Check your inbox for a link, or"}
        {!sent && (
          <>
            {" "}
            <button type="button" className="app-banner-link" onClick={onResend} disabled={sending}>
              {sending ? "sending…" : "resend the verification email"}
            </button>
            .
          </>
        )}
      </span>
      {error && <span className="app-banner-error">{error}</span>}
      <button type="button" className="app-banner-dismiss" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        ×
      </button>
    </div>
  );
}

/**
 * Dismissible-per-session nudge shown while `paymentFailed` is true (see
 * SubscriptionService.handleWebhookEvent's invoice.payment_failed case).
 * Same "doesn't gate anything, just a nudge" treatment as VerifyEmailBanner
 * above — Stripe's own retry schedule (not this banner) is what actually
 * determines whether the subscription eventually lapses, so dismissing this
 * is safe; it isn't the only warning the subscriber gets (there's also the
 * payment-failed email sent once when this first happens).
 */
function PaymentFailedBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="app-banner app-banner-danger">
      <span>
        Your last payment didn't go through. <Link to="/dashboard">Update your payment method</Link> to avoid losing access.
      </span>
      <button type="button" className="app-banner-dismiss" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        ×
      </button>
    </div>
  );
}

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
      <div className="app-content">
        {user && !user.emailVerified && <VerifyEmailBanner />}
        {user && user.paymentFailed && <PaymentFailedBanner />}
        {children}
      </div>
    </div>
  );
}
