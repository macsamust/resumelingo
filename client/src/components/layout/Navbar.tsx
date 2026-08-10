import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header>
      <nav>
        <div className="logo-block">
          <Link to="/" className="logo">
            ResumeLingo
          </Link>
          <span className="logo-tagline">&ldquo;We Speak Resume.&rdquo;</span>
        </div>
        <div className="nav-links">
          <Link to="/#how">How it works</Link>
          <Link to="/#features">Features</Link>
          <Link to="/#pricing">Pricing</Link>
          <Link to="/career-center">Career Center</Link>
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
