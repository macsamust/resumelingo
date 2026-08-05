import { AchievementEntry } from "../../types";

interface Props {
  achievements: AchievementEntry[];
  onChange: (achievements: AchievementEntry[]) => void;
}

const BLANK_ENTRY: AchievementEntry = {
  challenge: "",
  action: "",
  result: "",
};

/**
 * Lets a user describe achievements using the STAR/CAR method — Challenge
 * (what problem existed), Action (what they did), Result (what changed
 * because of it). Each entry becomes one impact-focused resume bullet (see
 * server/src/services/ContentGenerator.ts), replacing the old generic
 * bullets built from raw profession Q&A answers. Same add/remove pattern as
 * ExperienceEditor, but no dates — an achievement is a single accomplishment,
 * not a role held over time.
 */
export function AchievementEditor({ achievements, onChange }: Props) {
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
