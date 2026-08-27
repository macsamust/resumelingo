import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ParrotLogo } from "../brand/ParrotLogo";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Logged-out visitors still see Career Center (it's public marketing
  // content, same articles used to attract new signups — see
  // CareerCenterPage.tsx). Once someone's logged in, though, it's a
  // Professional/Premium perk, same gate as the dashboard's Career Articles
  // section (DashboardPage.tsx's showCareerArticles) and the Career Coach/
  // Thank-You Letter links in AppShell.
  const isProfessional = user?.subscriptionTier === "professional";
  const isPremium = user?.subscriptionTier === "premium";
  const showCareerCenterLink = !user || isProfessional || isPremium;

  return (
    <header>
      <nav>
        <div className="logo-block">
          <Link to="/" className="logo" title="Hello, I am Ploy">
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
          {user ? (
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
