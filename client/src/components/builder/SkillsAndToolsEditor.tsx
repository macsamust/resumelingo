import { SkillOrTool } from "../../types";
import { getSkillsAndToolsSuggestions } from "../../config/skillsAndTools";

interface Props {
  professionKey: string;
  professionLabel: string;
  value: SkillOrTool[];
  onChange: (value: SkillOrTool[]) => void;
}

/**
 * Click-to-select "Skills & Tools" picker (Edit Resume, Portrait template
 * only — see ResumeEditPage.tsx and ResumePreview.tsx's photo-banner-sidebar
 * family). Suggestions come from config/skillsAndTools.ts, keyed by the
 * selected profession; clicking a suggestion toggles it in/out of `value`.
 * Selections persist across a profession change (only the suggestion list
 * updates) — same "don't destroy user data on an unrelated change" stance
 * as the rest of the builder.
 */
export function SkillsAndToolsEditor({ professionKey, professionLabel, value, onChange }: Props) {
  const suggestions = getSkillsAndToolsSuggestions(professionKey);

  const isSelected = (label: string, category: SkillOrTool["category"]) =>
    value.some((v) => v.label === label && v.category === category);

  const toggle = (label: string, category: SkillOrTool["category"]) => {
    if (isSelected(label, category)) {
      onChange(value.filter((v) => !(v.label === label && v.category === category)));
    } else {
      onChange([...value, { label, category }]);
    }
  };

  const renderGroup = (label: string, category: SkillOrTool["category"], items: string[]) => (
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
      </div>
    </div>
  );

  return (
    <div className="skill-picker">
      <p className="hero-note" style={{ marginBottom: 16 }}>
        Suggested for <strong>{professionLabel}</strong> — click a keyword to add it.
      </p>
      {renderGroup("Skills", "skill", suggestions.skills)}
      {renderGroup("Tools", "tool", suggestions.tools)}

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
