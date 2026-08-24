import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";

/**
 * Reached from the "Verify email address" link in
 * AuthService.sendVerificationEmail. Unlike UnsubscribePage, this fires
 * automatically on load rather than waiting for a button click — an email
 * security scanner prefetching the link just verifies the address a little
 * early, which isn't a harmful outcome the way an unwanted auto-unsubscribe
 * would be, so the extra click-to-confirm friction isn't needed here.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { refresh } = useAuth();
  const [status, setStatus] = useState<"pending" | "done" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("This verification link is missing its token — please use the link from your email.");
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus("done");
        // Picks up the now-true emailVerified flag if this browser also
        // happens to be logged in, so AppShell's banner disappears without
        // needing a manual refresh.
        refresh();
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Verify your email</h1>
        {status === "pending" && <p className="sub">Confirming your email address…</p>}
        {status === "done" && <p className="sub">Your email address is verified.</p>}
        {status === "error" && error && <div className="form-error">{error}</div>}
        <p className="form-footnote">
          <Link to="/dashboard">Go to your dashboard</Link>
        </p>
      </div>
    </div>
  );
}
