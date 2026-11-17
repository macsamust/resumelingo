import { ClipboardEvent, KeyboardEvent, useRef } from "react";
import { CertificationEntry } from "../../types";
import { moveItem } from "../../utils/listEditing";
import { EmptyRowExample } from "./EmptyRowExample";

const EXAMPLE_FIELDS = [{ label: "Certification or training", value: "PMP, Project Management Institute" }];

interface Props {
  certifications: CertificationEntry[];
  onChange: (certifications: CertificationEntry[]) => void;
}

/**
 * "Certifications & Training" — one short line per credential (a name-only
 * entry like "PMP" or "OSHA 30 Construction Safety"). Deliberately compact
 * rows rather than the full cards Work Experience uses: there's only one
 * field, and a long list should stay easy to scan. Enter in a row adds a new
 * one below it, and pasting several lines into a row splits them into
 * separate entries, so a whole list can come straight from a document.
 */
export function CertificationsEditor({ certifications, onChange }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const focusLater = (index: number) => setTimeout(() => inputs.current[index]?.focus(), 0);

  const updateEntry = (index: number, name: string) => {
    onChange(certifications.map((entry, i) => (i === index ? { ...entry, name } : entry)));
  };
  const insertAfter = (index: number) => {
    const next = [...certifications];
    next.splice(index + 1, 0, { name: "" });
    onChange(next);
    focusLater(index + 1);
  };
  const addEntry = () => {
    onChange([...certifications, { name: "" }]);
    focusLater(certifications.length);
  };
  const removeEntry = (index: number) => onChange(certifications.filter((_, i) => i !== index));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      insertAfter(index);
    }
  };

  // A multi-line paste (e.g. a list copied from a document) becomes one entry per line, with bullet markers removed.
  const onPaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData("text");
    if (!/\r?\n/.test(text)) return;
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[•●▪◦‣▸►·*\-–—]|\d{1,2}[.)])\s+/, "").trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const current = certifications[index]?.name.trim();
    const next = [...certifications];
    next.splice(index, 1, ...(current ? [{ name: current }] : []), ...lines.map((name) => ({ name })));
    onChange(next);
  };

  return (
    <div className="experience-editor">
      {certifications.length === 0 && <EmptyRowExample fields={EXAMPLE_FIELDS} />}
      {certifications.map((entry, index) => (
        <div className="cert-row" key={index}>
          <input
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={entry.name}
            onChange={(e) => updateEntry(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            onPaste={(e) => onPaste(e, index)}
            placeholder="e.g. PMP, AWS Solutions Architect, OSHA 30"
            aria-label={`Certification or training ${index + 1}`}
          />
          <button
            type="button"
            className="btn btn-ghost experience-row-move"
            onClick={() => onChange(moveItem(certifications, index, "up"))}
            disabled={index === 0}
            aria-label="Move up"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-ghost experience-row-move"
            onClick={() => onChange(moveItem(certifications, index, "down"))}
            disabled={index === certifications.length - 1}
            aria-label="Move down"
            title="Move down"
          >
            ↓
          </button>
          <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add certification or training
      </button>
      <p className="field-hint">Press Enter to add another line, or paste a whole list at once.</p>
    </div>
  );
}
