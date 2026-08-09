import { WorkExperienceEntry } from "../../types";
import { generateId } from "../../utils/id";

interface Props {
  experience: WorkExperienceEntry[];
  onChange: (experience: WorkExperienceEntry[]) => void;
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
export function ExperienceEditor({ experience, onChange }: Props) {
  const updateEntry = (index: number, patch: Partial<WorkExperienceEntry>) => {
    onChange(experience.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...experience, blankEntry()]);
  const removeEntry = (index: number) => onChange(experience.filter((_, i) => i !== index));

  return (
    <div className="experience-editor">
      {experience.map((entry, index) => (
        <div className="experience-row" key={index}>
          <div className="field">
            <label>Company</label>
            <input
              value={entry.company}
              onChange={(e) => updateEntry(index, { company: e.target.value })}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="field">
            <label>Title held</label>
            <input
              value={entry.title}
              onChange={(e) => updateEntry(index, { title: e.target.value })}
              placeholder="e.g. Senior Software Engineer"
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
            <div className="field">
              <label>Start date</label>
              <input
                type="month"
                value={entry.startDate}
                onChange={(e) => updateEntry(index, { startDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label>End date</label>
              <input
                type="month"
                value={entry.endDate ?? ""}
                disabled={entry.current}
                onChange={(e) => updateEntry(index, { endDate: e.target.value })}
              />
            </div>
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
          <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add work experience
      </button>
    </div>
  );
}
