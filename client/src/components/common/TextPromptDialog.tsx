import { FormEvent, useState } from "react";
import { Modal } from "./Modal";

interface Props {
  title: string;
  message?: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * A styled window.prompt() replacement for a single text field — e.g.
 * Dashboard's "name the cloned resume" step. Trims and requires a non-empty
 * value before submitting, and shows a loading state on the confirm button
 * while the request is in flight, same pattern as PasswordResetDialog.
 */
export function TextPromptDialog({ title, message, label, defaultValue = "", placeholder, confirmLabel = "Save", onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError("This can't be blank.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(value.trim());
    } catch (err) {
      // Sep 2026 QA pass: a server-side failure (e.g. Dashboard's Clone
      // hitting the resume-limit cap) used to be swallowed by the caller and
      // surfaced only as a corner toast, while this dialog stayed open
      // looking unresponsive — attention is on the modal at this point, not
      // the toast stack, so the error belongs here instead.
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onCancel} disableDismiss={busy}>
      <form onSubmit={handleSubmit}>
        {message && <p className="modal-message">{message}</p>}
        <div className="field">
          <label>{label}</label>
          <input autoFocus required value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
