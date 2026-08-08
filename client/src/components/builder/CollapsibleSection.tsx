import { ReactNode, useEffect, useState } from "react";

/** Bumping `token` re-applies `open` to every section listening for it — see the "Expand all"/"Collapse all" link in ResumeEditPage. */
export interface ForceOpenSignal {
  open: boolean;
  token: number;
}

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  /** Whether the section starts open. Defaults to true so existing behavior (everything visible) is unchanged until the user collapses something. */
  defaultOpen?: boolean;
  /** Optional broadcast signal (e.g. from an "Expand all"/"Collapse all" control) that overrides the section's own open/closed state whenever it changes. */
  forceOpen?: ForceOpenSignal;
}

/** A titled, collapsible block used to group each part of the resume editor (Details, Sharing, Work Experience, ...) so long forms are easier to navigate. */
export function CollapsibleSection({ title, children, defaultOpen = true, forceOpen }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) setOpen(forceOpen.open);
    // Only react when the signal actually changes (its token), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen?.token]);

  return (
    <section className={`builder-section ${open ? "" : "is-collapsed"}`}>
      <button type="button" className="builder-section-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="builder-section-chevron" aria-hidden="true">
          ▾
        </span>
        <span>{title}</span>
      </button>
      {open && <div className="builder-section-body">{children}</div>}
    </section>
  );
}
