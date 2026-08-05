import { AwardEntry } from "../../types";

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

  return (
    <div className="experience-editor">
      {awards.map((entry, index) => (
        <div className="experience-row" key={index}>
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
          <div className="field">
            <label>Date received</label>
            <input type="month" value={entry.date} onChange={(e) => updateEntry(index, { date: e.target.value })} />
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <input
              value={entry.description ?? ""}
              onChange={(e) => updateEntry(index, { description: e.target.value })}
              placeholder="e.g. Awarded to the top-performing engineer company-wide"
            />
          </div>
          <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add award
      </button>
    </div>
  );
}
