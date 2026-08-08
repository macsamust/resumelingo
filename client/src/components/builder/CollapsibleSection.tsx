import { ReactNode, useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  /** Whether the section starts open. Defaults to true so existing behavior (everything visible) is unchanged until the user collapses something. */
  defaultOpen?: boolean;
}

/** A titled, collapsible block used to group each part of the resume editor (Details, Sharing, Work Experience, ...) so long forms are easier to navigate. */
export function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

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
