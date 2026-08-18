import { KeyboardEvent } from "react";
import { AwardEntry } from "../../types";
import { duplicateItem, moveItem } from "../../utils/listEditing";
import { MonthYearField } from "./MonthYearField";

interface Props {
  awards: AwardEntry[];
  onChange: (awards: AwardEntry[]) => void;
}

const BLANK_ENTRY: AwardEntry = {
  title: "",
  issuer: "",
  date: "",
  description: "",
};

/**
 * Lets a user list awards/honors: title, issuing organization, a single
 * month/year received, and an optional short description. Simpler than
 * ExperienceEditor/EducationEditor since awards are a single point in time
 * rather than a date range. See ResumePreview.tsx for how this list is
 * sorted (most recent first) and rendered.
 */
export function AwardsEditor({ awards, onChange }: Props) {
  const updateEntry = (index: number, patch: Partial<AwardEntry>) => {
    onChange(awards.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...awards, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(awards.filter((_, i) => i !== index));
  const duplicateEntry = (index: number) => onChange(duplicateItem(awards, index));

  // See ExperienceEditor's identical handler for the full explanation —
  // Enter in a plain text field of the last row adds a new blank row.
  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    const target = e.target;
    if (e.key !== "Enter" || index !== awards.length - 1) return;
    if (!(target instanceof HTMLInputElement) || target.type === "checkbox") return;
    e.preventDefault();
    addEntry();
  };

  return (
    <div className="experience-editor">
      {awards.map((entry, index) => (
        <div className="experience-row" key={index} onKeyDown={(e) => handleRowKeyDown(e, index)}>
          <div className="field">
            <label>Award title</label>
            <input
              value={entry.title}
              onChange={(e) => updateEntry(index, { title: e.target.value })}
              placeholder="e.g. Employee of the Year"
            />
          </div>
          <div className="field">
            <label>Issuing organization</label>
            <input
              value={entry.issuer}
              onChange={(e) => updateEntry(index, { issuer: e.target.value })}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <MonthYearField label="Date received" value={entry.date} onChange={(v) => updateEntry(index, { date: v })} />
          <div className="field">
            <label>Description (optional)</label>
            <input
              value={entry.description ?? ""}
              onChange={(e) => updateEntry(index, { description: e.target.value })}
              placeholder="e.g. Awarded to the top-performing engineer company-wide"
            />
          </div>
          <div className="experience-row-actions">
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(awards, index, "up"))}
              disabled={index === 0}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(awards, index, "down"))}
              disabled={index === awards.length - 1}
              aria-label="Move down"
              title="Move down"
            >
              ↓
            </button>
            <button type="button" className="btn btn-ghost experience-remove" onClick={() => duplicateEntry(index)}>
              Duplicate
            </button>
            <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add award
      </button>
    </div>
  );
}
