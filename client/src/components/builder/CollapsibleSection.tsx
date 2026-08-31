import { ReactNode, useLayoutEffect, useState } from "react";

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
  /**
   * When provided, renders a small status glyph next to the title — a green
   * check once the section has meaningful content, a red minus while it's
   * still empty. Left undefined (no glyph at all) for sections where
   * "complete" doesn't really apply — Template and Sharing always have a
   * value by default, and ATS Check/Version History are tools rather than
   * data entry. See ResumeEditPage's `sectionProgress` for how each
   * section's value is computed.
   */
  complete?: boolean;
}

/** A titled, collapsible block used to group each part of the resume editor (Details, Sharing, Work Experience, ...) so long forms are easier to navigate. */
export function CollapsibleSection({ title, children, defaultOpen = true, forceOpen, complete }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  // useLayoutEffect (not useEffect) so a forced open is applied synchronously
  // before the browser paints — a caller like ResumeEditPage's
  // scrollToAtsCheck relies on the section already being expanded (correct
  // final height) by the time its post-click scrollIntoView runs. With a
  // plain useEffect, that scroll could fire against the still-collapsed
  // layout (deferred effects run after paint), landing short of the target
  // on the first click and only reaching it on a second click once state had
  // caught up.
  useLayoutEffect(() => {
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
        <span className="builder-section-title">{title}</span>
        {complete !== undefined && (
          <span
            className={`builder-section-status ${complete ? "is-complete" : "is-empty"}`}
            aria-label={complete ? "Section has content" : "Section is empty"}
            title={complete ? "Section has content" : "Section is empty"}
            aria-hidden="false"
          >
            {complete ? "✓" : "−"}
          </span>
        )}
      </button>
      {open && <div className="builder-section-body">{children}</div>}
    </section>
  );
}
