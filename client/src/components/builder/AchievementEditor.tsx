import { useState } from "react";
import { AchievementEntry, WorkExperienceEntry } from "../../types";
import { duplicateItem, moveItem } from "../../utils/listEditing";
import { EmptyRowExample } from "./EmptyRowExample";

// Action first, matching the real form's field order below — it's the one
// field a bullet actually needs (see AchievementEditor's doc comment), so
// the example leads with it too instead of the C-A-R framework's usual
// Challenge-first order.
const EXAMPLE_FIELDS = [
  { label: "Action", value: "Redesigned the onboarding flow and cut it from 8 steps to 3" },
  { label: "Challenge", value: "Signups were dropping off 40% of the way through onboarding" },
  { label: "Result", value: "A 25% increase in completed signups within one quarter" },
];

interface Props {
  achievements: AchievementEntry[];
  onChange: (achievements: AchievementEntry[]) => void;
  /** Work history to offer in the "which job" dropdown — see AchievementEntry.experienceId. */
  experience: WorkExperienceEntry[];
  /** Only show the "which job" dropdown (as the first field, above Challenge) when the combined-format checkbox is on — it's meaningless data to collect otherwise, since the flat layout never reads experienceId. */
  showJobLink: boolean;
}

const BLANK_ENTRY: AchievementEntry = {
  challenge: "",
  action: "",
  result: "",
  experienceId: null,
};

/** Label shown in the "which job" dropdown for one work experience entry. */
function experienceLabel(entry: WorkExperienceEntry): string {
  if (entry.company && entry.title) return `${entry.title}, ${entry.company}`;
  return entry.company || entry.title || "Untitled role";
}

/**
 * A quantified Result ("cut onboarding time by 25%", "saved $40k annually")
 * reads as far stronger than a vague one ("improved onboarding") — this is
 * a simple, deliberately-narrow check for any digit, same rule-based spirit
 * as utils/atsCheck.ts, not an attempt to actually judge the writing.
 */
function hasNumber(text: string): boolean {
  return /\d/.test(text);
}

/**
 * Lets a user describe achievements using the STAR/CAR method — Challenge
 * (what problem existed), Action (what they did), Result (what changed
 * because of it). Each entry becomes one impact-focused resume bullet (see
 * server/src/services/ContentGenerator.ts), replacing the old generic
 * bullets built from raw profession Q&A answers. Same add/remove pattern as
 * ExperienceEditor, but no dates — an achievement is a single accomplishment,
 * not a role held over time.
 *
 * Only Action is shown by default (Challenge/Result collapsed behind a
 * toggle) — of the three, it's the only one that reads as a complete
 * sentence on its own (see ContentGenerator.toStarBullet: Challenge/Result
 * alone read like fragments, "In response to X." / "Resulting in Y."), so
 * it's the only field someone actually needs to fill in to get a real
 * bullet. Challenge/Result auto-reveal (and stay revealed) the moment
 * either has content, so an existing achievement that already used them —
 * or a resume loaded with data already in those fields — is never hidden
 * behind a click.
 */
export function AchievementEditor({ achievements, onChange, experience, showJobLink }: Props) {
  // Indices the person has explicitly expanded via "+ Add challenge &
  // result." Index-keyed, same identity convention as the rest of this
  // component's move/duplicate/remove (achievements have no stable id) —
  // see isExpanded below for why that's safe even across a reorder: an
  // entry with real Challenge/Result content always shows regardless of
  // this set, so the only thing that can look "off" after a move is a
  // still-empty row's toggle state, never a loss of visible data.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpanded = (index: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const updateEntry = (index: number, patch: Partial<AchievementEntry>) => {
    onChange(achievements.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => onChange([...achievements, { ...BLANK_ENTRY }]);
  const removeEntry = (index: number) => onChange(achievements.filter((_, i) => i !== index));
  const duplicateEntry = (index: number) => onChange(duplicateItem(achievements, index));

  return (
    <div className="experience-editor">
      {achievements.length === 0 && <EmptyRowExample fields={EXAMPLE_FIELDS} />}
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
          <div className="field">
            <label>Action: what did you do?</label>
            <textarea
              value={entry.action}
              onChange={(e) => updateEntry(index, { action: e.target.value })}
              placeholder="e.g. Redesigned the onboarding flow and cut it from 8 steps to 3"
            />
          </div>
          {(() => {
            const hasContent = entry.challenge.trim() !== "" || entry.result.trim() !== "";
            const isExpanded = hasContent || expanded.has(index);
            if (!isExpanded) {
              return (
                <button type="button" className="achievement-more-toggle" onClick={() => toggleExpanded(index)}>
                  + Add challenge &amp; result for more impact
                  <span className="field-hint">
                    e.g. "Signups were dropping off 40%" → "...a 25% increase in completed signups"
                  </span>
                </button>
              );
            }
            return (
              <>
                <div className="field">
                  <label>Challenge (optional): what problem existed?</label>
                  <textarea
                    value={entry.challenge}
                    onChange={(e) => updateEntry(index, { challenge: e.target.value })}
                    placeholder="e.g. Signups were dropping off 40% of the way through onboarding"
                  />
                </div>
                <div className="field">
                  <label>Result (optional): what changed because of it?</label>
                  <textarea
                    value={entry.result}
                    onChange={(e) => updateEntry(index, { result: e.target.value })}
                    placeholder="e.g. A 25% increase in completed signups within one quarter"
                  />
                  {entry.result.trim() !== "" && !hasNumber(entry.result) && (
                    <p className="field-hint">
                      Tip: a number makes this land harder, e.g. "25%", "3 weeks", "$40k", "2x".
                    </p>
                  )}
                </div>
                {!hasContent && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleExpanded(index)}>
                    − Hide challenge &amp; result
                  </button>
                )}
              </>
            );
          })()}
          <div className="experience-row-actions">
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(achievements, index, "up"))}
              disabled={index === 0}
              aria-label="Move up"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="btn btn-ghost experience-row-move"
              onClick={() => onChange(moveItem(achievements, index, "down"))}
              disabled={index === achievements.length - 1}
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
        + Add achievement
      </button>
    </div>
  );
}
