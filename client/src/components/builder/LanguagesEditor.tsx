import { KeyboardEvent } from "react";
import { LanguageEntry } from "../../types";
import { duplicateItem, moveItem } from "../../utils/listEditing";
import { EmptyRowExample } from "./EmptyRowExample";

const EXAMPLE_FIELDS = [
  { label: "Language", value: "Spanish" },
  { label: "Proficiency", value: "Full Professional Proficiency" },
];

/** Standard ILR-style scale, most fluent first — same wording resumes conventionally use, so this doesn't need to be freehand. */
const PROFICIENCY_OPTIONS = [
  "Native or Bilingual Proficiency",
  "Full Professional Proficiency",
  "Professional Working Proficiency",
  "Limited Working Proficiency",
  "Elementary Proficiency",
];

interface Props {
  languages: LanguageEntry[];
  onChange: (languages: LanguageEntry[]) => void;
}

const BLANK_ENTRY: LanguageEntry = {
  language: "",
  proficiency: PROFICIENCY_OPTIONS[0],
};

/**
 * Lets a user list languages they speak and how fluently — a language name
 * plus a proficiency level picked from a fixed scale (rather than typed
 * freehand) so resumes read consistently. Same add/remove/reorder pattern
 * as AwardsEditor, just two fields instead of four since there's no date
 * involved.
 */
export function LanguagesEditor({ languages, onChange }: Props) {
  const updateEntry = (index: number, patch: Partial<LanguageEntry>) => {
    onChange(languages.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...languages, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(languages.filter((_, i) => i !== index));
  const duplicateEntry = (index: number) => onChange(duplicateItem(languages, index));

  // See ExperienceEditor's identical handler for the full explanation —
  // Enter in a plain text field of the last row adds a new blank row.
  const handleRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    const target = e.target;
    if (e.key !== "Enter" || index !== languages.length - 1) return;
    if (!(target instanceof HTMLInputElement) || target.type === "checkbox") return;
    e.preventDefault();
    addEntry();
  };

  return (
    <div className="experience-editor">
      {languages.length === 0 && <EmptyRowExample fields={EXAMPLE_FIELDS} />}
      {languages.map((entry, index) => (
        <div className="experience-row" key={index} onKeyDown={(e) => handleRowKeyDown(e, index)}>
          <div className="field">
            <label>Language</label>
            <input
              value={entry.language}
              onChange={(e) => updateEntry(index, { language: e.target.value })}
              placeholder="e.g. Spanish"
            />
          </div>
          <div className="field">
            <label>Proficiency</label>
            <select value={entry.proficiency} onChange={(e) => updateEntry(index, { proficiency: e.target.value })}>
              {PROFICIENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="experience-row-actions">
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(languages, index, "up"))}
              disabled={index === 0}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(languages, index, "down"))}
              disabled={index === languages.length - 1}
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
        + Add language
      </button>
    </div>
  );
}
