import { EducationEntry } from "../../types";
import { MonthYearField } from "./MonthYearField";

interface Props {
  education: EducationEntry[];
  onChange: (education: EducationEntry[]) => void;
}

const BLANK_ENTRY: EducationEntry = {
  school: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  current: false,
};

/**
 * Lets a user build an education history: school, degree, field of study, a
 * start/end month, and a "currently enrolled" checkbox that clears and
 * disables the end date — same pattern as ExperienceEditor.tsx. See
 * ResumePreview.tsx for how this list gets sorted and rendered.
 */
export function EducationEditor({ education, onChange }: Props) {
  const updateEntry = (index: number, patch: Partial<EducationEntry>) => {
    onChange(education.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...education, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(education.filter((_, i) => i !== index));

  return (
    <div className="experience-editor">
      {education.map((entry, index) => (
        <div className="experience-row" key={index}>
          <div className="field">
            <label>School</label>
            <input
              value={entry.school}
              onChange={(e) => updateEntry(index, { school: e.target.value })}
              placeholder="e.g. University of Michigan"
            />
          </div>
          <div className="field">
            <label>Degree</label>
            <input
              value={entry.degree}
              onChange={(e) => updateEntry(index, { degree: e.target.value })}
              placeholder="e.g. B.S."
            />
          </div>
          <div className="field">
            <label>Field of study</label>
            <input
              value={entry.fieldOfStudy}
              onChange={(e) => updateEntry(index, { fieldOfStudy: e.target.value })}
              placeholder="e.g. Computer Science"
            />
          </div>
          <div className="experience-dates">
            <MonthYearField label="Start date" value={entry.startDate} onChange={(v) => updateEntry(index, { startDate: v })} />
            <MonthYearField
              label="End date"
              value={entry.endDate ?? ""}
              disabled={entry.current}
              onChange={(v) => updateEntry(index, { endDate: v })}
            />
          </div>
          <label className="experience-current">
            <input
              type="checkbox"
              checked={entry.current}
              onChange={(e) =>
                updateEntry(index, {
                  current: e.target.checked,
                  endDate: e.target.checked ? null : entry.endDate,
                })
              }
            />
            I'm currently enrolled here
          </label>
          <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add education
      </button>
    </div>
  );
}
