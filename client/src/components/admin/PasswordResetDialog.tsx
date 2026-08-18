import { FormEvent, useState } from "react";
import { Modal } from "../common/Modal";

interface Props {
  email: string;
  onSubmit: (password: string) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Styled prompt() replacement for admin's "set a new password" action —
 * validates length client-side (the server enforces the real minimum
 * regardless) and shows a loading state on the submit button while the
 * request is in flight, instead of a bare native prompt that gives no
 * feedback once dismissed.
 */
export function PasswordResetDialog({ email, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Reset password" onClose={onCancel} disableDismiss={busy}>
      <form onSubmit={handleSubmit}>
        <p className="modal-message">
          Set a new password for <strong>{email}</strong>.
        </p>
        <div className="field">
          <label>New password</label>
          <input
            type="password"
            autoFocus
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Setting…" : "Set password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
