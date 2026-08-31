import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi, ApiError } from "../api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Reset your password</h1>
          <div className="form-error">This reset link is missing its token. Please use the link from your email.</div>
          <p className="form-footnote">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset your password</h1>
        {done ? (
          <>
            <p className="sub">Your password has been reset.</p>
            <Link className="btn btn-primary btn-block" to="/login">
              Log in
            </Link>
          </>
        ) : (
          <>
            <p className="sub">Choose a new password for your account.</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label>New password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="field">
                <label>Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Reenter your new password"
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                {submitting ? "Resetting…" : "Reset password"}
              </button>
            </form>
            <p className="form-footnote">
              <Link to="/forgot-password">Request a new link</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
