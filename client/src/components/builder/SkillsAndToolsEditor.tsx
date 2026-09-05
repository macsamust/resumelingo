import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, catalogApi, skillSuggestionAiApi } from "../../api";
import { SkillOrTool } from "../../types";
import { Skeleton } from "../common/Skeleton";

interface Props {
  professionKey: string;
  professionLabel: string;
  value: SkillOrTool[];
  onChange: (value: SkillOrTool[]) => void;
  /** The resume's own title (e.g. "Senior Backend Engineer Resume") — passed through to the "Suggest more with AI" option so it can tailor suggestions to this specific title, not just the profession. */
  resumeTitle?: string;
  /** The resume's profession Q&A answers (Additional Details) — passed through so AI suggestions can be grounded in what this person actually said (tools they already named, years of experience, etc.), not just the title. */
  answers?: Record<string, string>;
  /**
   * Professional/Premium-gated (see worker's SkillSuggestionAiController) —
   * same tier as AchievementGeneratorPanel's canGenerate. Undefined (rather
   * than false) hides the AI section entirely, including its upgrade
   * prompt — used by AdminResumeEditPage.tsx, which doesn't offer any of
   * the AI-assist tools to admins editing a subscriber's resume on their
   * behalf.
   */
  canUseAi?: boolean;
}

/** Dedupes case-insensitively, preserving first-seen casing/order. */
function dedupeLabels(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Click-to-select "Skills & Tools" picker (Edit Resume, Portrait template
 * only — see ResumeEditPage.tsx and ResumePreview.tsx's photo-banner-sidebar
 * family). Suggestions are fetched from /skill-suggestions (see
 * server's SkillSuggestionController.ts), keyed by the selected profession —
 * an admin-editable list rather than a static config file, so an admin can
 * add/remove keywords from the admin console without a code deploy.
 * Clicking a suggestion toggles it in/out of `value`. Selections persist
 * across a profession change (only the suggestion list updates) — same
 * "don't destroy user data on an unrelated change" stance as the rest of
 * the builder.
 *
 * "Suggest more with AI" below the curated groups is additive, not a
 * replacement: the curated list is profession-wide and never fails, while
 * the AI pass (see SkillSuggestionAiApi/worker's SkillSuggestionAiService)
 * is tailored to this resume's actual title and only appears once
 * requested. A Workers AI outage there just means no extra chips, not a
 * broken picker.
 */
export function SkillsAndToolsEditor({ professionKey, professionLabel, value, onChange, resumeTitle, answers, canUseAi }: Props) {
  const [skills, setSkills] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [aiSkills, setAiSkills] = useState<string[]>([]);
  const [aiTools, setAiTools] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    catalogApi
      .listSkillSuggestions(professionKey)
      .then((res) => {
        if (cancelled) return;
        setSkills(res.skillSuggestions.filter((s) => s.category === "skill").map((s) => s.label));
        setTools(res.skillSuggestions.filter((s) => s.category === "tool").map((s) => s.label));
      })
      .catch(() => {
        if (!cancelled) {
          setSkills([]);
          setTools([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // A profession change invalidates any AI suggestions gathered for the
    // old one — same "don't leave stale suggestions around" reasoning as
    // resetting the curated lists above.
    setAiSkills([]);
    setAiTools([]);
    setAiStatus("idle");
    setAiError(null);
    return () => {
      cancelled = true;
    };
  }, [professionKey]);

  const isSelected = (label: string, category: SkillOrTool["category"]) =>
    value.some((v) => v.label === label && v.category === category);

  const toggle = (label: string, category: SkillOrTool["category"]) => {
    if (isSelected(label, category)) {
      onChange(value.filter((v) => !(v.label === label && v.category === category)));
    } else {
      onChange([...value, { label, category }]);
    }
  };

  const onSuggestWithAi = async () => {
    setAiStatus("loading");
    setAiError(null);
    try {
      const result = await skillSuggestionAiApi.generate({
        professionKey,
        title: resumeTitle,
        existingSkills: [...skills, ...aiSkills],
        existingTools: [...tools, ...aiTools],
        answers,
      });
      if (result.skills.length === 0 && result.tools.length === 0) {
        setAiError("Couldn't find anything new to suggest for this title. Try picking from the list above instead.");
        setAiStatus("error");
        return;
      }
      setAiSkills((prev) => dedupeLabels([...prev, ...result.skills]));
      setAiTools((prev) => dedupeLabels([...prev, ...result.tools]));
      setAiStatus("idle");
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : "Something went wrong generating suggestions. You can still pick from the list above.");
      setAiStatus("error");
    }
  };

  const renderGroup = (label: string, category: SkillOrTool["category"], items: string[], aiItems: string[] = []) => {
    if (items.length === 0 && aiItems.length === 0) return null;
    return (
      <div className="skill-picker-group">
        <div className="skill-picker-group-label">{label}</div>
        <div className="skill-picker-chips">
          {items.map((item) => {
            const selected = isSelected(item, category);
            return (
              <button
                type="button"
                key={item}
                className={`skill-picker-chip ${selected ? "selected" : ""}`}
                onClick={() => toggle(item, category)}
                aria-pressed={selected}
              >
                {item}
                {selected && <span aria-hidden="true"> ✓</span>}
              </button>
            );
          })}
          {aiItems.map((item) => {
            const selected = isSelected(item, category);
            return (
              <button
                type="button"
                key={`ai-${item}`}
                className={`skill-picker-chip skill-picker-chip-ai ${selected ? "selected" : ""}`}
                onClick={() => toggle(item, category)}
                aria-pressed={selected}
                title="Suggested by AI for this resume's title"
              >
                <span aria-hidden="true">✨ </span>
                {item}
                {selected && <span aria-hidden="true"> ✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="skill-picker">
      <p className="hero-note" style={{ marginBottom: 16 }}>
        Suggested for <strong>{professionLabel}</strong>: click a keyword to add it.
      </p>
      {loading ? (
        <div className="skill-picker-chips">
          {[70, 55, 90, 65, 80, 50].map((w, i) => (
            <Skeleton key={i} width={w} height={30} radius={999} />
          ))}
        </div>
      ) : (
        <>
          {renderGroup("Skills", "skill", skills, aiSkills)}
          {renderGroup("Tools", "tool", tools, aiTools)}
        </>
      )}

      {!loading && canUseAi !== undefined && (
        canUseAi ? (
          <div className="skill-picker-ai" style={{ marginTop: 4, marginBottom: 16 }}>
            <button type="button" className="btn btn-ai" onClick={onSuggestWithAi} disabled={aiStatus === "loading"}>
              <span aria-hidden="true">✨</span>{" "}
              {aiStatus === "loading" ? "Suggesting…" : aiSkills.length > 0 || aiTools.length > 0 ? "Suggest more with AI" : "Suggest more with AI for this title"}
            </button>
            {aiStatus === "error" && aiError && <div className="form-error" style={{ marginTop: 8 }}>{aiError}</div>}
          </div>
        ) : (
          <div className="hero-note-box" style={{ marginTop: 4, marginBottom: 16 }}>
            <p className="hero-note" style={{ marginBottom: 8 }}>
              AI suggestions tailored to this resume's title require the Professional or Premium plan. Upgrading
              opens in a new tab, so your progress here stays right where it is.
            </p>
            <Link to="/#pricing" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              Upgrade plan
            </Link>
          </div>
        )
      )}

      {value.length > 0 && (
        <div className="skill-picker-group" style={{ marginBottom: 0 }}>
          <div className="skill-picker-group-label">Selected ({value.length})</div>
          <div className="skill-picker-chips">
            {value.map((v) => (
              <button
                type="button"
                key={`${v.category}-${v.label}`}
                className="skill-picker-selected-chip"
                onClick={() => toggle(v.label, v.category)}
              >
                {v.label}
                <span aria-hidden="true" className="skill-picker-selected-remove">
                  ×
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
