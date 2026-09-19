import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ParrotLogo } from "../brand/ParrotLogo";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

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
        {/* How it works / Features / Pricing / Career Center only make sense
            for a logged-out visitor — every one of them points at the public
            homepage or its own paywalled preview, so on an actual app page
            (Dashboard, Edit Resume, ...) this whole row was just a way to
            accidentally navigate out of the app mid-session. Career Center
            used to also show here for a logged-in Professional/Premium
            subscriber, which turned out to be the actual problem behind it
            being "hard to find" (Sep 2026 UX review, UX-11): sitting in this
            row, next to three links that only make sense logged out, it read
            as marketing chrome to skim past rather than a real in-app
            destination. It now lives in AppShell's sidebar instead (gated
            the same Professional/Premium way), which is the correct single
            place for it. Gated on `!loading && !user` rather than `!user`
            alone for the same reason nav-actions below is: `user` starts
            null on every load, even an already-logged-in one mid-refresh, so
            gating on `user` alone would flash this row in before hiding it
            again once loading resolves. */}
        {!loading && !user && (
          <div className="nav-links">
            <Link to="/#how">How it works</Link>
            <Link to="/#features">Features</Link>
            <Link to="/#pricing">Pricing</Link>
            <Link to="/career-center">Career Center</Link>
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
