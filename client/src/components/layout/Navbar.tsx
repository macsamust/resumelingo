import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ParrotLogo } from "../brand/ParrotLogo";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  // Logged-out visitors still see Career Center (it's public marketing
  // content, same articles used to attract new signups — see
  // CareerCenterPage.tsx). Once someone's logged in, though, it's a
  // Professional/Premium perk, same gate as the dashboard's Career Articles
  // section (DashboardPage.tsx's showCareerArticles) and the Career Coach/
  // Thank-You Letter links in AppShell.
  const isProfessional = user?.subscriptionTier === "professional";
  const isPremium = user?.subscriptionTier === "premium";
  // `!loading &&` guards the same window nav-actions below guards with
  // `loading ? null : ...` — while the initial auth check is still in
  // flight, `user` reads as null regardless of what it resolves to, so
  // without this a logged-in Starter subscriber would see Career Center
  // flash in (it's public content, so `!user` alone says "show it") and then
  // vanish the instant loading finishes and their real tier turns out not to
  // qualify. Same root cause as the guest-chrome flash this was built to fix
  // (Sep 2026 UX review, UX-09) — AuthContext's `loading` already existed
  // for exactly this, it just wasn't being read anywhere in this component.
  const showCareerCenterLink = !loading && (!user || isProfessional || isPremium);

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
        <div className="nav-links">
          <Link to="/#how">How it works</Link>
          <Link to="/#features">Features</Link>
          <Link to="/#pricing">Pricing</Link>
          {showCareerCenterLink && <Link to="/career-center">Career Center</Link>}
        </div>
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
