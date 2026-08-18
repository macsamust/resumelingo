import { useState } from "react";
import { Modal } from "./Modal";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button red — for destructive actions (e.g. deleting an account). */
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

/**
 * A styled confirm() replacement — same "are you sure?" pattern, but
 * matches the app's own UI and stays open with a disabled/loading confirm
 * button while the action is actually in flight, rather than the
 * native dialog which closes instantly and gives no feedback once
 * dismissed.
 */
export function ConfirmDialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onCancel} disableDismiss={busy}>
      <p className="modal-message">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button type="button" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={handleConfirm} disabled={busy}>
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
