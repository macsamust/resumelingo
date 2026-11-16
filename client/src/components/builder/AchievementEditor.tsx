import { useEffect, useRef, useState } from "react";
import { AchievementEntry, WorkExperienceEntry } from "../../types";
import { duplicateItem } from "../../utils/listEditing";
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
  /** Only show the "which job" dropdown and group bullets under their jobs when the combined-format checkbox is on — it's meaningless data to collect otherwise, since the flat layout never reads experienceId. */
  showJobLink: boolean;
}

const BLANK_ENTRY: AchievementEntry = {
  challenge: "",
  action: "",
  result: "",
  experienceId: null,
};

/** Group key for bullets that aren't linked to any (known) job, and for the single group used by the flat layout. */
const OTHER_KEY = "__other";

/** Label shown in the "which job" dropdown for one work experience entry. */
function experienceLabel(entry: WorkExperienceEntry): string {
  if (entry.company && entry.title) return `${entry.title}, ${entry.company}`;
  return entry.company || entry.title || "Untitled role";
}

/** "2021 – Present" style range for a group header; empty when the job has no dates. */
function experienceDates(entry: WorkExperienceEntry): string {
  const start = entry.startDate?.slice(0, 4);
  const end = entry.current ? "Present" : entry.endDate?.slice(0, 4);
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
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

function matchesQuery(entry: AchievementEntry, q: string): boolean {
  return [entry.action, entry.challenge, entry.result].some((t) => t.toLowerCase().includes(q));
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
 *
 * Layout (a long career means dozens of bullets, so a wall of full cards
 * is unmanageable): every bullet is collapsed to a one-line summary and
 * only one is open for editing at a time. When the combined-format
 * checkbox is on, bullets are also grouped under the job they belong to,
 * each group collapsed behind a header with a bullet count. A search box
 * filters bullets by text and auto-opens the groups that match. This is a
 * display-only change — the underlying AchievementEntry[] (including its
 * flat order and experienceId links) is untouched.
 */
export function AchievementEditor({ achievements, onChange, experience, showJobLink }: Props) {
  // Indices the person has explicitly expanded via "+ Add challenge &
  // result." Index-keyed, same identity convention as the rest of this
  // component's move/duplicate/remove (achievements have no stable id) —
  // see the render below for why that's safe even across a reorder: an
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

  const grouped = showJobLink && experience.length > 0;
  const jobIds = new Set(experience.map((j) => j.id).filter((id): id is string => !!id));
  const keyOf = (entry: AchievementEntry): string =>
    grouped && entry.experienceId && jobIds.has(entry.experienceId) ? entry.experienceId : OTHER_KEY;

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searching = q !== "";

  // One bullet open for editing at a time (flat-array index).
  const [openRow, setOpenRow] = useState<number | null>(null);

  // Which job groups are open. Starts with the first group that has bullets
  // (the most recent job, in the usual order) so the page doesn't open on a
  // wall of collapsed headers.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const first = achievements.length > 0 ? achievements.find((a) => a.experienceId && jobIds.has(a.experienceId)) : undefined;
    return new Set([first?.experienceId ?? OTHER_KEY]);
  });

  // When a bullet is added from anywhere (this editor's "Add" buttons, the AI
  // generator panel above, Duplicate), make sure the group it landed in is
  // open so it never appears to vanish into a collapsed header.
  const prevLength = useRef(achievements.length);
  useEffect(() => {
    if (achievements.length > prevLength.current) {
      const landed = achievements[achievements.length - 1];
      const key = keyOf(landed);
      setOpenGroups((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    }
    prevLength.current = achievements.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements.length]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const updateEntry = (index: number, patch: Partial<AchievementEntry>) => {
    onChange(achievements.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const addEntry = (experienceId: string | null = null) => {
    onChange([...achievements, { ...BLANK_ENTRY, experienceId }]);
    setOpenRow(achievements.length);
    if (experienceId) setOpenGroups((prev) => new Set(prev).add(experienceId));
    else setOpenGroups((prev) => new Set(prev).add(OTHER_KEY));
  };

  const removeEntry = (index: number) => {
    onChange(achievements.filter((_, i) => i !== index));
    setOpenRow((cur) => (cur === null || cur === index ? null : cur > index ? cur - 1 : cur));
  };

  const duplicateEntry = (index: number) => {
    onChange(duplicateItem(achievements, index));
    setOpenRow(index + 1);
  };

  /** Swaps with the nearest neighbor in the same group (flat layout: the same list), skipping other jobs' bullets in between. */
  const neighborIndex = (index: number, direction: "up" | "down"): number | null => {
    const key = keyOf(achievements[index]);
    const step = direction === "up" ? -1 : 1;
    for (let i = index + step; i >= 0 && i < achievements.length; i += step) {
      if (keyOf(achievements[i]) === key) return i;
    }
    return null;
  };

  const moveEntry = (index: number, direction: "up" | "down") => {
    const target = neighborIndex(index, direction);
    if (target === null) return;
    const next = [...achievements];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setOpenRow((cur) => (cur === index ? target : cur === target ? index : cur));
  };

  const renderRow = (entry: AchievementEntry, index: number) => {
    const isOpen = openRow === index;
    const summary = entry.action.trim() || entry.challenge.trim() || entry.result.trim();
    const hasContent = entry.challenge.trim() !== "" || entry.result.trim() !== "";
    const showCR = hasContent || expanded.has(index);
    return (
      <div className={`ach-row${isOpen ? " ach-row-open" : ""}`} key={index}>
        <div className="ach-row-head">
          <button
            type="button"
            className="ach-row-main"
            onClick={() => setOpenRow(isOpen ? null : index)}
            aria-expanded={isOpen}
          >
            <span className="ach-row-caret" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
            <span className={`ach-row-text${summary ? "" : " ach-row-empty"}`}>
              {summary || "New achievement: click to write it"}
            </span>
            {hasContent && <span className="ach-row-tag">+C/R</span>}
          </button>
          <button
            type="button"
            className="btn btn-ghost experience-row-move"
            onClick={() => moveEntry(index, "up")}
            disabled={neighborIndex(index, "up") === null}
            aria-label="Move up"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-ghost experience-row-move"
            onClick={() => moveEntry(index, "down")}
            disabled={neighborIndex(index, "down") === null}
            aria-label="Move down"
            title="Move down"
          >
            ↓
          </button>
        </div>
        {isOpen && (
          <div className="ach-row-editor">
            {grouped && (
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
            {!showCR ? (
              <button type="button" className="achievement-more-toggle" onClick={() => toggleExpanded(index)}>
                + Add challenge &amp; result for more impact
                <span className="field-hint">
                  e.g. "Signups were dropping off 40%" → "...a 25% increase in completed signups"
                </span>
              </button>
            ) : (
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
            )}
            <div className="experience-row-actions">
              <button type="button" className="btn btn-ghost experience-remove" onClick={() => duplicateEntry(index)}>
                Duplicate
              </button>
              <button type="button" className="btn btn-ghost experience-remove" onClick={() => removeEntry(index)}>
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Build the groups: each job in work-history order, then "Other highlights".
  type Group = { key: string; title: string; subtitle: string; jobId: string | null; items: { entry: AchievementEntry; index: number }[] };
  const groups: Group[] = [];
  if (grouped) {
    for (const job of experience) {
      if (!job.id) continue;
      groups.push({ key: job.id, title: experienceLabel(job), subtitle: experienceDates(job), jobId: job.id, items: [] });
    }
  }
  groups.push({
    key: OTHER_KEY,
    title: grouped ? "Other highlights" : "Achievements",
    subtitle: grouped ? "Not linked to a job" : "",
    jobId: null,
    items: [],
  });
  achievements.forEach((entry, index) => {
    const g = groups.find((x) => x.key === keyOf(entry)) ?? groups[groups.length - 1];
    g.items.push({ entry, index });
  });

  const matchCount = searching ? achievements.filter((a) => matchesQuery(a, q)).length : achievements.length;
  const allKeys = groups.filter((g) => g.items.length > 0).map((g) => g.key);
  const allOpen = allKeys.length > 0 && allKeys.every((k) => openGroups.has(k));

  return (
    <div className="experience-editor">
      {achievements.length === 0 && <EmptyRowExample fields={EXAMPLE_FIELDS} />}

      {achievements.length > 3 && (
        <div className="ach-toolbar">
          <input
            type="search"
            className="ach-search"
            placeholder="Search achievements (e.g. onboarding, budget)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search achievements"
          />
          {grouped && !searching && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setOpenGroups(allOpen ? new Set() : new Set(allKeys))}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
      )}
      {searching && (
        <p className="hero-note" style={{ marginBottom: 10 }}>
          {matchCount === 0 ? `No achievements match "${query}".` : `${matchCount} of ${achievements.length} match "${query}".`}
        </p>
      )}

      {groups.map((g) => {
        const visible = searching ? g.items.filter(({ entry }) => matchesQuery(entry, q)) : g.items;
        // Flat layout: no group chrome, just the (filtered) rows.
        if (!grouped) {
          return <div key={g.key}>{visible.map(({ entry, index }) => renderRow(entry, index))}</div>;
        }
        // Grouped: hide empty "Other highlights" and, while searching, any group with no match.
        if (g.items.length === 0 && g.key === OTHER_KEY) return null;
        if (searching && visible.length === 0) return null;
        const isOpen = searching || openGroups.has(g.key);
        const count = searching ? `${visible.length} of ${g.items.length}` : `${g.items.length}`;
        return (
          <div className="ach-group" key={g.key}>
            <button type="button" className="ach-group-head" onClick={() => toggleGroup(g.key)} aria-expanded={isOpen}>
              <span className="ach-row-caret" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
              <span className="ach-group-title">
                {g.title}
                {g.subtitle && <small>{g.subtitle}</small>}
              </span>
              <span className="ach-group-count">
                {count} {g.items.length === 1 && !searching ? "bullet" : "bullets"}
              </span>
            </button>
            {isOpen && (
              <div className="ach-group-body">
                {visible.map(({ entry, index }) => renderRow(entry, index))}
                {!searching && g.jobId && (
                  <button type="button" className="ach-group-add" onClick={() => addEntry(g.jobId)}>
                    + Add achievement to this job
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button type="button" className="btn btn-ghost btn-block" onClick={() => addEntry(null)}>
        + Add achievement
      </button>
    </div>
  );
}
