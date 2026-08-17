import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, ApiError } from "../api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      // Same success state regardless of whether the email matched an
      // account — the server never reveals that either (see AuthService.requestPasswordReset).
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot your password?</h1>
        {sent ? (
          <>
            <p className="sub">
              If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires in 1
              hour.
            </p>
            <p className="form-footnote">
              <Link to="/login">Back to log in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="sub">Enter your email and we'll send you a link to reset your password.</p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="form-footnote">
              <Link to="/login">Back to log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
