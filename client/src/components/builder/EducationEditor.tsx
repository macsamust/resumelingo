import { KeyboardEvent } from "react";
import { EducationEntry } from "../../types";
import { duplicateItem, moveItem } from "../../utils/listEditing";
import { EmptyRowExample } from "./EmptyRowExample";
import { MonthYearField } from "./MonthYearField";

const EXAMPLE_FIELDS = [
  { label: "School", value: "University of Michigan" },
  { label: "Degree", value: "B.S." },
  { label: "Field of study", value: "Computer Science" },
  { label: "Start date", value: "Aug 2016" },
  { label: "End date", value: "May 2020" },
];

interface Props {
  education: EducationEntry[];
  onChange: (education: EducationEntry[]) => void;
  /** Distinct school names from this resume's own other rows plus the user's other resumes — see ResumeEditPage's schoolSuggestions. Powers the native browser autocomplete via <datalist>; omitted (empty array) just means no suggestions yet. */
  schoolSuggestions?: string[];
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
export function EducationEditor({ education, onChange, schoolSuggestions = [] }: Props) {
  const updateEntry = (index: number, patch: Partial<EducationEntry>) => {
    onChange(education.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...education, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(education.filter((_, i) => i !== index));
  const duplicateEntry = (index: number) => onChange(duplicateItem(education, index));

  // See ExperienceEditor's identical handler for the full explanation —
  // Enter in a plain text field of the last row adds a new blank row.
  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    const target = e.target;
    if (e.key !== "Enter" || index !== education.length - 1) return;
    if (!(target instanceof HTMLInputElement) || target.type === "checkbox") return;
    e.preventDefault();
    addEntry();
  };

  return (
    <div className="experience-editor">
      {schoolSuggestions.length > 0 && (
        <datalist id="education-school-suggestions">
          {schoolSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {education.length === 0 && <EmptyRowExample fields={EXAMPLE_FIELDS} />}
      {education.map((entry, index) => (
        <div className="experience-row" key={index} onKeyDown={(e) => handleRowKeyDown(e, index)}>
          <div className="field">
            <label>School</label>
            <input
              value={entry.school}
              onChange={(e) => updateEntry(index, { school: e.target.value })}
              placeholder="e.g. University of Michigan"
              list={schoolSuggestions.length > 0 ? "education-school-suggestions" : undefined}
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
          <div className="experience-row-actions">
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(education, index, "up"))}
              disabled={index === 0}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(education, index, "down"))}
              disabled={index === education.length - 1}
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
        + Add education
      </button>
    </div>
  );
}
