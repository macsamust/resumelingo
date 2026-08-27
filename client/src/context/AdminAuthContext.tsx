import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { adminApi } from "../api";
import { AdminAuthUser } from "../types";

interface AdminAuthContextValue {
  admin: AdminAuthUser | null;
  loading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

/** Mirrors AuthProvider's shape but is fully separate — its own token, its own "me" check — so an admin session never leaks into or gets confused with a regular user session. */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("resumelingo_admin_token");
    if (!token) {
      setLoading(false);
      return;
    }
    adminApi
      .me()
      .then((res) => setAdmin(res.admin))
      .catch(() => {
        adminApi.setToken(null);
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string, totpCode?: string) => {
    const { admin: loggedInAdmin, token } = await adminApi.login({ email, password, totpCode });
    adminApi.setToken(token);
    setAdmin(loggedInAdmin);
  };

  const logout = () => {
    adminApi.setToken(null);
    setAdmin(null);
  };

  return <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
