import { AchievementEntry, WorkExperienceEntry } from "../../types";

interface Props {
  achievements: AchievementEntry[];
  onChange: (achievements: AchievementEntry[]) => void;
  /** Work history to offer in the "which job" dropdown — see AchievementEntry.experienceId. */
  experience: WorkExperienceEntry[];
}

const BLANK_ENTRY: AchievementEntry = {
  challenge: "",
  action: "",
  result: "",
  experienceId: null,
};

/** Label shown in the "which job" dropdown for one work experience entry. */
function experienceLabel(entry: WorkExperienceEntry): string {
  if (entry.company && entry.title) return `${entry.title} — ${entry.company}`;
  return entry.company || entry.title || "Untitled role";
}

/**
 * Lets a user describe achievements using the STAR/CAR method — Challenge
 * (what problem existed), Action (what they did), Result (what changed
 * because of it). Each entry becomes one impact-focused resume bullet (see
 * server/src/services/ContentGenerator.ts), replacing the old generic
 * bullets built from raw profession Q&A answers. Same add/remove pattern as
 * ExperienceEditor, but no dates — an achievement is a single accomplishment,
 * not a role held over time.
 */
export function AchievementEditor({ achievements, onChange, experience }: Props) {
  const updateEntry = (index: number, patch: Partial<AchievementEntry>) => {
    onChange(achievements.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...achievements, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(achievements.filter((_, i) => i !== index));

  return (
    <div className="experience-editor">
      {achievements.map((entry, index) => (
        <div className="experience-row" key={index}>
          <div className="field">
            <label>Challenge — what problem existed?</label>
            <textarea
              value={entry.challenge}
              onChange={(e) => updateEntry(index, { challenge: e.target.value })}
              placeholder="e.g. Signups were dropping off 40% of the way through onboarding"
            />
          </div>
          <div className="field">
            <label>Action — what did you do?</label>
            <textarea
              value={entry.action}
              onChange={(e) => updateEntry(index, { action: e.target.value })}
              placeholder="e.g. Redesigned the onboarding flow and cut it from 8 steps to 3"
            />
          </div>
          <div className="field">
            <label>Result — what changed because of it?</label>
            <textarea
              value={entry.result}
              onChange={(e) => updateEntry(index, { result: e.target.value })}
              placeholder="e.g. A 25% increase in completed signups within one quarter"
            />
          </div>
          {experience.length > 0 && (
            <div className="field">
              <label>Which job is this from? (optional)</label>
              <select
                value={entry.experienceId ?? ""}
                onChange={(e) => updateEntry(index, { experienceId: e.target.value || null })}
              >
                <option value="">Not linked to a specific job</option>
                {experience.map((job, jobIndex) => (
                  <option key={job.id ?? jobIndex} value={job.id ?? ""} disabled={!job.id}>
                    {experienceLabel(job)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add achievement
      </button>
    </div>
  );
}
