import { ReferenceEntry } from "../../types";
import { MonthYearField } from "./MonthYearField";

interface Props {
  references: ReferenceEntry[];
  onChange: (references: ReferenceEntry[]) => void;
}

const BLANK_ENTRY: ReferenceEntry = {
  name: "",
  companyPosition: "",
  company: "",
  email: "",
  phone: "",
  affiliation: "",
  dateObservedStart: "",
  dateObservedEnd: "",
};

/**
 * Lets a Premium subscriber list professional references: name, the
 * reference's position and company, contact info, how they're affiliated
 * with the candidate (e.g. "Former Manager", "Colleague"), and the Start/End
 * date range when they worked with/observed the candidate (each entered via
 * the calendar-icon MonthYearField, same as Work Experience/Education —
 * neither field requires the other to be filled in). Same list-editor
 * pattern as AwardsEditor.tsx. Only ever shown when the "References"
 * checkbox in ResumeEditPage is on (see Resume.referencesEnabled) — off by
 * default, and Premium-subscriber-gated server-side regardless of what's
 * sent here.
 */
export function ReferencesEditor({ references, onChange }: Props) {
  const updateEntry = (index: number, patch: Partial<ReferenceEntry>) => {
    onChange(references.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...references, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(references.filter((_, i) => i !== index));

  return (
    <div className="experience-editor">
      {references.map((entry, index) => (
        <div className="experience-row" key={index}>
          <div className="field">
            <label>Name</label>
            <input
              value={entry.name}
              onChange={(e) => updateEntry(index, { name: e.target.value })}
              placeholder="e.g. Jordan Lee"
            />
          </div>
          <div className="field">
            <label>Company position</label>
            <input
              value={entry.companyPosition}
              onChange={(e) => updateEntry(index, { companyPosition: e.target.value })}
              placeholder="e.g. Engineering Director"
            />
          </div>
          <div className="field">
            <label>Company</label>
            <input
              value={entry.company}
              onChange={(e) => updateEntry(index, { company: e.target.value })}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="experience-location">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={entry.email}
                onChange={(e) => updateEntry(index, { email: e.target.value })}
                placeholder="e.g. jordan@example.com"
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                value={entry.phone}
                onChange={(e) => updateEntry(index, { phone: e.target.value })}
                placeholder="e.g. (555) 123-4567"
              />
            </div>
          </div>
          <div className="field">
            <label>Affiliation</label>
            <input
              value={entry.affiliation}
              onChange={(e) => updateEntry(index, { affiliation: e.target.value })}
              placeholder="e.g. Former Manager, Colleague, Client"
            />
          </div>
          <div className="field-group-label">Date observed</div>
          <div className="experience-dates">
            <MonthYearField
              label="Start"
              value={entry.dateObservedStart}
              onChange={(v) => updateEntry(index, { dateObservedStart: v })}
            />
            <MonthYearField
              label="End"
              value={entry.dateObservedEnd}
              onChange={(v) => updateEntry(index, { dateObservedEnd: v })}
            />
          </div>
          <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add reference
      </button>
    </div>
  );
}
