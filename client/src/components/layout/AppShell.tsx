import { Link, NavLink } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/resumes/new", label: "New Resume" },
  { to: "/thank-you-letter", label: "Thank-You Letter" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-links">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "")}>
              {link.label}
            </NavLink>
          ))}
        </div>
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
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
