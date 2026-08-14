import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="spinner-page"><div className="spinner-ring" role="status" aria-label="Loading" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
