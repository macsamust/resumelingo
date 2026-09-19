import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ParrotLogo } from "../brand/ParrotLogo";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const isProfessional = user?.subscriptionTier === "professional";
  const isPremium = user?.subscriptionTier === "premium";
  const showCareerCenterLink = isProfessional || isPremium;

  return (
    <header>
      <nav>
        <div className="logo-block">
          <Link to="/" className="logo">
            <ParrotLogo size={30} />
            ResumeLingo
          </Link>
          <span className="logo-tagline">&ldquo;We Speak Resume.&rdquo;</span>
        </div>
        {/* How it works / Features / Pricing only make sense for a
            logged-out visitor — each is a homepage anchor with no valid
            destination once you're actually in the app. Logged in, this row
            switches to The Full Circle, Help & FAQ, and Career Center
            (Professional/Premium — Starter would just hit
            CareerCenterPage.tsx's own paywall). Career Center briefly moved
            to AppShell's sidebar instead (Sep 2026 UX review, UX-11) and was
            pulled back out — CJ preferred it stay up here rather than sit
            among AppShell's do-something tools (Dashboard, New Resume, Cover
            Letter, ...), which it doesn't read as one of. The Full Circle
            points at its own dedicated page (FullCirclePage.tsx) rather than
            the homepage's `/#full-circle` anchor, the same way Career Center
            points at CareerCenterPage.tsx instead of the homepage's
            `#resources` teaser — and for the same reason, it's in both rows
            here, not just the logged-in one, since the page itself already
            handles what to show/link depending on whether you're signed in.
            Every link here shares the single `.nav-links a` style with the
            logged-out row below — same element, same class, deliberately no
            per-branch styling, so font/size/weight/color always match
            between the two regardless of which links happen to be in either
            one. Gated on `!loading` (both branches) for the same reason
            nav-actions below is: `user` starts null on every load, even an
            already-logged-in one mid-refresh, so this would otherwise flash
            the wrong row in before swapping to the right one a moment
            later. */}
        {!loading && (
          <div className="nav-links">
            {user ? (
              <>
                <Link to="/full-circle">The Full Circle</Link>
                <Link to="/help">Help &amp; FAQ</Link>
                {showCareerCenterLink && <Link to="/career-center">Career Center</Link>}
              </>
            ) : (
              <>
                <Link to="/#how">How it works</Link>
                <Link to="/#features">Features</Link>
                <Link to="/#pricing">Pricing</Link>
                <Link to="/full-circle">The Full Circle</Link>
                <Link to="/career-center">Career Center</Link>
              </>
            )}
          </div>
        )}
        <div className="nav-actions">
          {/* `loading` comes from AuthContext's own initial token-verification
              fetch — it already existed for exactly this, just wasn't being
              read here. Without this guard, `user` starts as null on every
              load (even a logged-in one, mid-refresh) so this used to render
              Log in / Get started first and only swap to Dashboard / Log out
              once the fetch resolved a moment later — a visible flash of the
              wrong chrome on every logged-in page load (Sep 2026 UX review,
              UX-09). Rendering nothing during that window is a strict
              improvement over rendering the wrong thing, even though it
              means a brief empty gap instead. */}
          {loading ? null : user ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost">
                Dashboard
              </Link>
              <button
                className="btn btn-primary"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
