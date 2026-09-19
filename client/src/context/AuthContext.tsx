import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authApi } from "../api";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  register: (input: { name: string; email: string; password: string; profession?: string; acceptedTerms: boolean }) => Promise<void>;
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

  // SEC-A01 (Sep 2026): no localStorage token to check anymore — the
  // `rl_session`/`rl_refresh` cookies are HttpOnly, so this can't read them
  // even to check existence. Just ask /auth/me and let the cookie (or
  // ApiClient's silent refresh-and-retry, if the access token already
  // expired) answer the question. A logged-out visitor gets a plain 401
  // here, same as before.
  const refresh = async () => {
    try {
      const { user: me } = await authApi.me();
      setUser(me);
    } catch {
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
    const { user: newUser } = await authApi.register(input);
    setUser(newUser);
  };

  const login: AuthContextValue["login"] = async (email, password) => {
    const { user: loggedInUser } = await authApi.login({ email, password });
    setUser(loggedInUser);
  };

  // Fires the server-side logout (revokes the refresh token, clears both
  // cookies) but doesn't block on it — the UI should feel instant, and a
  // failed logout call (e.g. offline) shouldn't trap the user in a
  // logged-in-looking screen when they've already asked to leave.
  const logout = () => {
    authApi.logout().catch(() => {});
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
