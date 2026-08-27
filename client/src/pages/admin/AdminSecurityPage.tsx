import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminShell } from "../../components/layout/AdminShell";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { Modal } from "../../components/common/Modal";
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
  const { admin, logout } = useAdminAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);

  // Local override of admin.totpEnabled rather than refetching the whole
  // admin from context — AdminAuthContext has no "refresh" action, and
  // this page is the only place that needs to react to the flag changing
  // within the same session.
  const [totpEnabled, setTotpEnabled] = useState(admin?.totpEnabled ?? false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [confirmingEnroll, setConfirmingEnroll] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);

  const onBeginEnroll = async () => {
    setTotpError(null);
    setEnrolling(true);
    try {
      const result = await adminApi.beginTotpEnroll();
      setEnrollment(result);
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't start two-factor setup.");
    } finally {
      setEnrolling(false);
    }
  };

  const onConfirmEnroll = async (e: FormEvent) => {
    e.preventDefault();
    setTotpError(null);
    setConfirmingEnroll(true);
    try {
      const { backupCodes: codes } = await adminApi.confirmTotpEnroll(enrollCode);
      setBackupCodes(codes);
      setEnrollment(null);
      setEnrollCode("");
      setTotpEnabled(true);
    } catch (err) {
      setTotpError(err instanceof ApiError ? err.message : "Couldn't confirm that code.");
    } finally {
      setConfirmingEnroll(false);
    }
  };

  const onDisable = async () => {
    setDisabling(true);
    try {
      await adminApi.disableTotp(disablePassword);
      setTotpEnabled(false);
      setDisablePassword("");
      setConfirmDisable(false);
      showToast("success", "Two-factor authentication turned off.");
    } catch (err) {
      showToast("error", err instanceof ApiError ? err.message : "Couldn't disable two-factor authentication.");
    } finally {
      setDisabling(false);
    }
  };

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

      <section className="admin-new-template">
        <h2>Two-factor authentication</h2>

        {backupCodes ? (
          <>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Two-factor authentication is on. Save these one-time backup codes somewhere safe — each works once, in
              place of a code from your authenticator app, if you ever lose access to it. This is the only time
              they'll be shown.
            </p>
            <pre className="admin-totp-backup-codes">{backupCodes.join("\n")}</pre>
            <button type="button" className="btn btn-primary" onClick={() => setBackupCodes(null)}>
              I've saved these codes
            </button>
          </>
        ) : totpEnabled ? (
          <>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Two-factor authentication is currently on for this account.
            </p>
            <button type="button" className="btn btn-ghost admin-danger" onClick={() => setConfirmDisable(true)}>
              Turn off two-factor authentication
            </button>
          </>
        ) : enrollment ? (
          <form onSubmit={onConfirmEnroll}>
            <p className="hero-note" style={{ marginBottom: 12 }}>
              Scan this into an authenticator app (Google Authenticator, Authy, 1Password, etc.) — either by pasting
              the URI below into an "import from link" option, or by entering the secret manually. Then enter the
              6-digit code it shows to finish setup.
            </p>
            <div className="field">
              <label>Secret (manual entry)</label>
              <pre className="admin-totp-secret">{enrollment.secret}</pre>
            </div>
            <div className="field">
              <label>Setup URI</label>
              <pre className="admin-totp-secret admin-totp-uri">{enrollment.otpauthUri}</pre>
            </div>
            {totpError && <div className="form-error">{totpError}</div>}
            <div className="field">
              <label>Code from your authenticator app</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value)}
                placeholder="123456"
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={confirmingEnroll}>
                {confirmingEnroll ? "Confirming…" : "Confirm and turn on"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEnrollment(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="hero-note" style={{ marginBottom: 16 }}>
              Not currently enabled. Adds a second step at login (a code from an authenticator app) beyond your
              password — recommended given this console can delete accounts and change billing.
            </p>
            <button type="button" className="btn btn-primary" onClick={onBeginEnroll} disabled={enrolling}>
              {enrolling ? "Starting…" : "Set up two-factor authentication"}
            </button>
          </>
        )}
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

      {confirmDisable && (
        <Modal title="Turn off two-factor authentication" onClose={() => setConfirmDisable(false)} disableDismiss={disabling}>
          <p className="modal-message">Enter your password to confirm turning off two-factor authentication.</p>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              autoFocus
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDisable(false)} disabled={disabling}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={onDisable} disabled={disabling || !disablePassword}>
              {disabling ? "Turning off…" : "Turn off"}
            </button>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
}
