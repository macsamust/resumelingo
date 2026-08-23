import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi, ApiError } from "../api";

/**
 * Reached from the "Unsubscribe from the weekly digest" link in
 * ViewDigestService's email — deliberately not logged-in (mirrors
 * ResetPasswordPage's pattern of reading a token from the query string).
 * Unsubscribing requires an explicit button click here rather than firing
 * automatically on page load, so an email security scanner prefetching the
 * link can't silently unsubscribe the user on their behalf.
 */
export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onUnsubscribe = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.unsubscribeDigest(token);
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
          <h1>Unsubscribe</h1>
          <div className="form-error">This unsubscribe link is missing its token — please use the link from your email.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Weekly resume digest</h1>
        {done ? (
          <p className="sub">You've been unsubscribed from the weekly resume view digest. You can re-enable it anytime from your Profile page.</p>
        ) : (
          <>
            <p className="sub">Stop receiving the weekly email summarizing views on your resumes?</p>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary btn-block" onClick={onUnsubscribe} disabled={submitting}>
              {submitting ? "Unsubscribing…" : "Unsubscribe me"}
            </button>
          </>
        )}
        <p className="form-footnote">
          <Link to="/login">Back to ResumeLingo</Link>
        </p>
      </div>
    </div>
  );
}
