import { KeyboardEvent } from "react";
import { AchievementEntry, WorkExperienceEntry } from "../../types";

interface Props {
  achievements: AchievementEntry[];
  onChange: (achievements: AchievementEntry[]) => void;
  /** Work history to offer in the "which job" dropdown — see AchievementEntry.experienceId. */
  experience: WorkExperienceEntry[];
  /** Only show the "which job" dropdown when the combined-format checkbox is on — same rule as AchievementEditor's identical prop. */
  showJobLink: boolean;
}

const BLANK_ENTRY: AchievementEntry = {
  challenge: "",
  action: "",
  result: "",
  experienceId: null,
};

/** Label shown in the "which job" dropdown for one work experience entry — same as AchievementEditor's. */
function experienceLabel(entry: WorkExperienceEntry): string {
  if (entry.company && entry.title) return `${entry.title} — ${entry.company}`;
  return entry.company || entry.title || "Untitled role";
}

/**
 * A simpler, single-line view onto the same achievements list
 * AchievementEditor edits — a "highlight" here is really just an achievement
 * with only the Action field filled in (Challenge/Result stay blank), which
 * is what makes it render as a clean plain bullet rather than STAR-stitched
 * language (see ContentGenerator.toStarBullet). Sharing the same
 * AchievementEntry[]/experienceId data model as Key Achievements is what
 * lets Highlights use the same "Combine Work Experience with Achievements"
 * job-nesting toggle and appear conjoined with Key Achievements in the
 * rendered resume, instead of being a separate parallel bullet system.
 * Mainly populated by "Import an existing resume" (see
 * ResumeImportPanel.tsx), also editable by hand for anyone who'd rather type
 * plain bullets than fill out the full Challenge/Action/Result form.
 */
export function HighlightsEditor({ achievements, onChange, experience, showJobLink }: Props) {
  const updateEntry = (index: number, patch: Partial<AchievementEntry>) => {
    onChange(achievements.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...achievements, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(achievements.filter((_, i) => i !== index));

  // Enter in the last row adds a new blank row — same convenience pattern
  // as ExperienceEditor/AwardsEditor's identical handler.
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== "Enter" || index !== achievements.length - 1) return;
    e.preventDefault();
    addEntry();
  };

  return (
    <div className="experience-editor">
      {achievements.length === 0 && (
        <p className="hero-note" style={{ marginBottom: 12 }}>
          One bullet per line — e.g. "Led the rebuild of the shipment-tracking service, cutting p95 latency from
          1200ms to 180ms."
        </p>
      )}
      {achievements.map((entry, index) => (
        <div className="experience-row" key={index}>
          {showJobLink && experience.length > 0 && (
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
          <div className="field" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={entry.action}
              onChange={(e) => updateEntry(index, { action: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="e.g. Cut deployment time in half by automating the release pipeline"
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-block" onClick={addEntry}>
        + Add highlight
      </button>
    </div>
  );
}
