import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdminAuth();

  if (loading) return <div className="spinner-page"><div className="spinner-ring" role="status" aria-label="Loading" /></div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
