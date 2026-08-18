import { useState } from "react";
import { Resume } from "../../types";

interface Props<T> {
  /** The user's other resumes — see ResumeEditPage's `otherResumes`. */
  otherResumes: Resume[];
  /** Pulls the relevant array (e.g. `r.experience`) off a candidate resume. */
  getItems: (resume: Resume) => T[];
  /** Appends the copied (and already-transformed, if `transform` was given) items to the current list. */
  onCopy: (items: T[]) => void;
  /** Adjusts each copied item before it's appended — e.g. giving a duplicated WorkExperienceEntry a fresh id. */
  transform?: (item: T) => T;
  /** Placeholder option text, e.g. "Copy work experience from…". */
  label: string;
}

/**
 * A small "copy this section from one of my other resumes" control — lets
 * someone building resume #2 or #3 pull in Work Experience or Education
 * they already entered elsewhere instead of retyping it. Copies are
 * additive (appended after whatever's already in the list, never a
 * destructive replace), so it's safe to use more than once or alongside
 * manually-entered rows. Renders nothing if none of the user's other
 * resumes actually have anything in this section to offer.
 */
export function CopyFromResume<T>({ otherResumes, getItems, onCopy, transform, label }: Props<T>) {
  const [selectedId, setSelectedId] = useState("");

  const eligible = otherResumes.filter((r) => getItems(r).length > 0);
  if (eligible.length === 0) return null;

  const handleCopy = () => {
    const source = eligible.find((r) => r.id === selectedId);
    if (!source) return;
    const items = getItems(source).map((item) => (transform ? transform(item) : item));
    onCopy(items);
    setSelectedId("");
  };

  return (
    <div className="copy-from-resume">
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} aria-label={label}>
        <option value="">{label}</option>
        {eligible.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-ghost" disabled={!selectedId} onClick={handleCopy}>
        Copy
      </button>
    </div>
  );
}
