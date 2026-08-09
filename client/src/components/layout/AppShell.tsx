import { NavLink } from "react-router-dom";
import { ReactNode } from "react";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/resumes/new", label: "New Resume" },
  { to: "/thank-you-letter", label: "Thank-You Letter" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
