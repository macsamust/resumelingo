import { ReactNode, useEffect } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Disables Escape/backdrop-click dismissal — used while a request is in flight, so a stray Escape (or an accidental click on the backdrop) can't lose feedback mid-save. */
  disableDismiss?: boolean;
}

/**
 * A centered overlay dialog matching the app's own styling — the shared
 * building block behind ConfirmDialog and any other admin dialog that used
 * to be a native confirm()/prompt(). Unlike a native dialog, this is
 * reliably dismissible with Escape across every browser and doesn't look
 * out of place next to the rest of the UI.
 */
export function Modal({ title, onClose, children, disableDismiss }: Props) {
  useEffect(() => {
    if (disableDismiss) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, disableDismiss]);

  return (
    <div className="modal-backdrop" onClick={() => !disableDismiss && onClose()}>
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={disableDismiss} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
