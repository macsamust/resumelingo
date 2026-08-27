import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "../../components/layout/AdminShell";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { useToast } from "../../components/common/Toast";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminApi, ApiError } from "../../api";

/**
 * Self-service security settings for the *calling* admin's own account —
 * separate from Admin Accounts (which manages other admins) since nothing
 * here ever takes a `:id`. Added alongside the Aug 2026 pre-launch security
 * pass (see worker's TODO.md, "Admin console — security/access hardening").
 */
export function AdminSecurityPage() {
  const { logout } = useAdminAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const onRevoke = async () => {
    setRevoking(true);
    try {
      await adminApi.revokeSessions();
      // The call that just succeeded invalidated the very token that made
      // it — every session, including this one, is now signed out
      // server-side. Clearing local state and redirecting to login is just
      // catching the client up to that; the next authenticated request
      // would have failed with a 401 anyway.
      logout();
      navigate("/admin/login");
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't sign out of sessions.");
      setRevoking(false);
    }
  };

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>Security</h1>
      </div>

      <section className="admin-new-template">
        <h2>Sessions</h2>
        <p className="hero-note" style={{ marginBottom: 16 }}>
          Admin sessions expire automatically after 12 hours. If you think a login link or session might have leaked
          — a shared device, a browser left open somewhere — sign out of every session right now instead of waiting.
          This immediately invalidates every admin token for your account, including the one you're using right now,
          so you'll need to log back in afterward.
        </p>
        <button type="button" className="btn btn-ghost admin-danger" onClick={() => setConfirmRevoke(true)}>
          Sign out of all sessions
        </button>
      </section>

      {confirmRevoke && (
        <ConfirmDialog
          title="Sign out of all sessions"
          message="This immediately invalidates every admin session for your account, including this one. You'll be redirected to log in again. Continue?"
          confirmLabel={revoking ? "Signing out…" : "Sign out everywhere"}
          danger
          onConfirm={onRevoke}
          onCancel={() => setConfirmRevoke(false)}
        />
      )}
    </AdminShell>
  );
}
