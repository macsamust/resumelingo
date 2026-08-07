import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();

  if (loading) return <div className="spinner-page">Loading…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
