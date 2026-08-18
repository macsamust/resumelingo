import { KeyboardEvent } from "react";
import { WorkExperienceEntry } from "../../types";
import { generateId } from "../../utils/id";
import { duplicateItem, moveItem } from "../../utils/listEditing";
import { MonthYearField } from "./MonthYearField";

interface Props {
  experience: WorkExperienceEntry[];
  onChange: (experience: WorkExperienceEntry[]) => void;
  /** Distinct company/title values from this resume's own other rows plus the user's other resumes — see ResumeEditPage's companySuggestions/titleSuggestions. Powers the native browser autocomplete on those two fields via <datalist>; omitted (empty array) is fine, it just means no suggestions yet. */
  companySuggestions?: string[];
  titleSuggestions?: string[];
}

function blankEntry(): WorkExperienceEntry {
  return {
    id: generateId(),
    company: "",
    title: "",
    city: "",
    state: "",
    startDate: "",
    endDate: "",
    current: false,
  };
}

/**
 * Lets a user build a chronological work history: company, title held, a
 * start/end month for each job, and a "currently work here" checkbox that
 * clears and disables the end date (see ResumePreview.tsx for how this list
 * gets sorted and rendered — current roles first, then by most recent end
 * date, so entries don't need to be added in any particular order here).
 */
export function ExperienceEditor({ experience, onChange, companySuggestions = [], titleSuggestions = [] }: Props) {
  const updateEntry = (index: number, patch: Partial<WorkExperienceEntry>) => {
    onChange(experience.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...experience, blankEntry()]);
  const removeEntry = (index: number) => onChange(experience.filter((_, i) => i !== index));
  // Duplicate needs a fresh id — achievements link to a job by
  // WorkExperienceEntry.id (see AchievementEditor's "which job" dropdown),
  // and sharing the original's id would nest the same achievements under
  // both entries at once.
  const duplicateEntry = (index: number) => onChange(duplicateItem(experience, index, (entry) => ({ ...entry, id: generateId() })));

  // Hitting Enter in any plain text field of the last row adds a new blank
  // row — a spreadsheet-style shortcut for entering several jobs in a row
  // without reaching for the "+ Add" button each time. Excludes checkboxes
  // (Enter shouldn't toggle "I currently work here" into also adding a row)
  // and anything that isn't the last row (so it can't fire mid-list).
  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    const target = e.target;
    if (e.key !== "Enter" || index !== experience.length - 1) return;
    if (!(target instanceof HTMLInputElement) || target.type === "checkbox") return;
    e.preventDefault();
    addEntry();
  };

  return (
    <div className="experience-editor">
      {companySuggestions.length > 0 && (
        <datalist id="experience-company-suggestions">
          {companySuggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      )}
      {titleSuggestions.length > 0 && (
        <datalist id="experience-title-suggestions">
          {titleSuggestions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      )}
      {experience.map((entry, index) => (
        <div className="experience-row" key={entry.id ?? index} onKeyDown={(e) => handleRowKeyDown(e, index)}>
          <div className="field">
            <label>Company</label>
            <input
              value={entry.company}
              onChange={(e) => updateEntry(index, { company: e.target.value })}
              placeholder="e.g. Acme Corp"
              list={companySuggestions.length > 0 ? "experience-company-suggestions" : undefined}
            />
          </div>
          <div className="field">
            <label>Title held</label>
            <input
              value={entry.title}
              onChange={(e) => updateEntry(index, { title: e.target.value })}
              placeholder="e.g. Senior Software Engineer"
              list={titleSuggestions.length > 0 ? "experience-title-suggestions" : undefined}
            />
          </div>
          <div className="experience-location">
            <div className="field">
              <label>City</label>
              <input
                value={entry.city ?? ""}
                onChange={(e) => updateEntry(index, { city: e.target.value })}
                placeholder="e.g. Austin"
              />
            </div>
            <div className="field">
              <label>State</label>
              <input
                value={entry.state ?? ""}
                onChange={(e) => updateEntry(index, { state: e.target.value })}
                placeholder="e.g. TX"
              />
            </div>
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
            I currently work here
          </label>
          <div className="experience-row-actions">
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(experience, index, "up"))}
              disabled={index === 0}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(experience, index, "down"))}
              disabled={index === experience.length - 1}
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
        + Add work experience
      </button>
    </div>
  );
}
