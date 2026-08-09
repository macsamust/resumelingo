import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

const LINKS = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/plans", label: "Plans & Pricing" },
  { to: "/admin/templates", label: "Templates" },
  { to: "/admin/skill-suggestions", label: "Skills & Tools" },
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
      <aside className="app-sidebar">
        <div className="admin-sidebar-head">
          <span className="admin-badge">Admin</span>
          {admin && <p className="admin-sidebar-email">{admin.email}</p>}
        </div>
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {link.label}
          </NavLink>
        ))}
        <button className="btn btn-ghost admin-logout" onClick={onLogout} type="button">
          Log out
        </button>
      </aside>
      <div className="app-content">{children}</div>
    </div>
  );
}
