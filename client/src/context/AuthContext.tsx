import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi, setAuthToken } from "../api";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  register: (input: { name: string; email: string; password: string; profession?: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  /** Syncs context state after a profile edit (ProfilePage calls authApi itself, then this). */
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = localStorage.getItem("resumelingo_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user: me } = await authApi.me();
      setUser(me);
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register: AuthContextValue["register"] = async (input) => {
    const { user: newUser, token } = await authApi.register(input);
    setAuthToken(token);
    setUser(newUser);
  };

  const login: AuthContextValue["login"] = async (email, password) => {
    const { user: loggedInUser, token } = await authApi.login({ email, password });
    setAuthToken(token);
    setUser(loggedInUser);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  const updateUser = (updated: AuthUser) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refresh, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
