import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Catch-all for any route that doesn't match — previously App.tsx's `*`
 * route silently rendered LandingPage, which made a broken or mistyped
 * link look like it worked instead of telling the visitor the page simply
 * doesn't exist. Kept intentionally simple (no AppShell/AdminShell
 * dependency) since this can be hit by anyone, logged in or not, on any
 * route shape.
 */
export function NotFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <main>
      <section className="not-found wrap">
        <p className="not-found-code">404</p>
        <h1>Page not found</h1>
        <p className="lead">
          The page you're looking for doesn't exist. It may have been moved, or the link might just have a typo.
        </p>
        <div className="not-found-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to dashboard
            </Link>
          ) : (
            <Link to="/" className="btn btn-primary">
              Go home
            </Link>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
        <p className="hero-note" style={{ marginTop: 20 }}>
          Think this is a mistake? Email <a href="mailto:support@resumelingo.com">support@resumelingo.com</a>.
        </p>
      </section>
    </main>
  );
}
