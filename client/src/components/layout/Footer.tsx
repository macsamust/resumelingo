import { Link, useNavigate } from "react-router-dom";
import { ParrotLogo } from "../brand/ParrotLogo";
import { useAuth } from "../../context/AuthContext";

export function Footer() {
  // App.tsx renders this Footer around every route except public-resume and
  // admin ones — including the Dashboard and every other logged-in page, not
  // just the marketing site — so a logged-in visitor could always see this
  // Account column still offering Log in / Sign up (Sep 2026 UX review,
  // UX-09). Also reads `loading` (same flag Navbar.tsx uses) rather than
  // just `user`, for the same reason Navbar needs it: `user` starts null on
  // every load, even an already-logged-in one mid-refresh, so gating on
  // `user` alone would just move the guest-chrome flash from the header down
  // to the footer instead of actually fixing it.
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <ParrotLogo size={28} />
              ResumeLingo
            </Link>
            <p>A web based resume, hosted in the cloud, shareable with one link, public or private, always yours to update.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/#how">How it works</Link>
            <Link to="/#features">Features</Link>
            <Link to="/#pricing">Pricing</Link>
            <Link to="/whats-new">What's New</Link>
          </div>
          <div className="footer-col">
            <h4>Career Center</h4>
            <Link to="/career-center#resume-tips">Resume tips</Link>
            <Link to="/career-center#interview-tips">Interview tips</Link>
            <Link to="/career-center#salary-negotiation">Salary negotiation</Link>
            <Link to="/#stories">Success stories</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            {loading ? null : user ? (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <button
                  type="button"
                  className="footer-link-button"
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
                <Link to="/login">Log in</Link>
                <Link to="/signup">Sign up</Link>
              </>
            )}
            <Link to="/help">Help &amp; FAQ</Link>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} ResumeLingo. All rights reserved.</p>
          <p>Made for people who'd rather share a link than an attachment.</p>
          {/* Build-derived identifier, not a hand-maintained version number — see vite.config.ts's doc comment. */}
          <p className="footer-build-tag">Build {__APP_VERSION__}</p>
        </div>
      </div>
    </footer>
  );
}
