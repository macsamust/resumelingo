import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Module-level counter rather than component state — toasts just need a
// unique key for React and for dismissal, nothing that needs to reset per
// provider instance.
let nextId = 0;

/**
 * App-wide toast notifications — a styled alert() replacement. Mounted once
 * at the app root (see main.tsx), above both AuthProvider and
 * AdminAuthProvider, so every page — regular or admin — can call
 * useToast()'s showToast from anywhere beneath it. Each toast auto-dismisses
 * after 4s but can also be dismissed manually; several can stack at once.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <span>{t.message}</span>
            <button type="button" className="toast-dismiss" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Throws if used outside a <ToastProvider> — same "fail loud, not silent" convention as the app's other context hooks (useAuth, useAdminAuth). */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
