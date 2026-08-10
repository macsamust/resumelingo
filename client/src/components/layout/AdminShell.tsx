import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

/**
 * Grouped by what the section manages — Subscriber (accounts/billing) vs.
 * Resume (content that shapes resumes themselves) — rather than one flat
 * list, now that there are enough admin sections for the grouping to
 * actually help with scanning.
 */
const LINK_GROUPS = [
  {
    label: "Subscribe",
    links: [
      { to: "/admin/users", label: "Users" },
      { to: "/admin/plans", label: "Plans & Pricing" },
    ],
  },
  {
    label: "Resume",
    links: [
      { to: "/admin/templates", label: "Templates" },
      { to: "/admin/skill-suggestions", label: "Skills & Tools" },
      { to: "/admin/role-descriptions", label: "Role Descriptions" },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar admin-sidebar">
        <div className="admin-sidebar-head">
          <span className="admin-badge">Admin</span>
          {admin && <p className="admin-sidebar-email">{admin.email}</p>}
        </div>
        {LINK_GROUPS.map((group) => (
          <div className="app-sidebar-group" key={group.label}>
            <span className="app-sidebar-group-label">{group.label}</span>
            <div className="app-sidebar-links">
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "")}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-ghost admin-logout" onClick={onLogout} type="button">
          Log out
        </button>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
