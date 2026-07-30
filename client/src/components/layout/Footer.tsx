import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <span className="dot">W</span>Websume
            </Link>
            <p>A web-based resume, hosted in the cloud, shareable with one link — public or private, always yours to update.</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/#how">How it works</Link>
            <Link to="/#features">Features</Link>
            <Link to="/#pricing">Pricing</Link>
          </div>
          <div className="footer-col">
            <h4>Career Center</h4>
            <Link to="/#resources">Resume tips</Link>
            <Link to="/#resources">Interview & salary tips</Link>
            <Link to="/#stories">Success stories</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Websume. All rights reserved.</p>
          <p>Made for people who'd rather share a link than an attachment.</p>
        </div>
      </div>
    </footer>
  );
}
