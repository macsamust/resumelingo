import { useEffect, useRef } from "react";
import { formatMonth } from "./ResumePreview";

interface Props {
  label: string;
  /** "YYYY-MM", or "" for not-yet-set — same shape <input type="month"> already used, so no data migration is needed anywhere this plugs in. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

/** Descending (most recent first) — work/education history is overwhelmingly recent, so this keeps the common case near the top. Runs a year into the future for expected-completion dates. */
function yearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1950; y--) years.push(y);
  return years;
}
const YEARS = yearOptions();

/**
 * Replaces the native <input type="month"> used for every Work Experience
 * and Education start/end date. That native control isn't consistent across
 * browsers — Firefox in particular has no month-picker UI at all and falls
 * back to a plain free-text box, which is exactly the "type anything"
 * inconsistency this exists to prevent. A calendar-icon trigger opens a
 * small Month + Year dropdown pair instead, so entry is always two
 * constrained selects, never free text, regardless of browser — same
 * component used for every template (Timeline, Portrait, all the rest),
 * since Work Experience/Education editing isn't template-specific.
 */
export function MonthYearField({ label, value, onChange, disabled }: Props) {
  const [year, month] = value ? value.split("-") : ["", ""];
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Closes the popover once both Month and Year are set, rather than
  // requiring an explicit "Apply"/close action — picking the second of the
  // two values is a natural "I'm done" signal.
  useEffect(() => {
    if (year && month && detailsRef.current) detailsRef.current.open = false;
  }, [year, month]);

  const displayLabel = value ? formatMonth(value) : "Select date";

  const onMonthChange = (nextMonth: string) => {
    onChange(`${year || new Date().getFullYear()}-${nextMonth}`);
  };
  const onYearChange = (nextYear: string) => {
    onChange(`${nextYear}-${month || "01"}`);
  };

  const icon = (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" className="month-year-icon">
      <rect x="2.5" y="4" width="15" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <line x1="2.5" y1="7.5" x2="17.5" y2="7.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="6" y1="2.5" x2="6" y2="5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="14" y1="2.5" x2="14" y2="5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );

  // Disabled (e.g. "I currently work here" checked, so End date doesn't
  // apply) renders as a plain static row rather than a <details>/<summary>
  // — that element has no native disabled state, so this is the only way to
  // fully block opening it rather than just dimming it.
  if (disabled) {
    return (
      <div className="field month-year-field">
        <label>{label}</label>
        <div className="month-year-trigger disabled">
          {icon}
          <span className="month-year-placeholder">{displayLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="field month-year-field">
      <label>{label}</label>
      <details className="month-year-picker" ref={detailsRef}>
        <summary className="month-year-trigger">
          {icon}
          <span className={value ? "month-year-value" : "month-year-placeholder"}>{displayLabel}</span>
        </summary>
        <div className="month-year-panel">
          <select aria-label={`${label} month`} value={month} onChange={(e) => onMonthChange(e.target.value)}>
            <option value="" disabled>
              Month
            </option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select aria-label={`${label} year`} value={year} onChange={(e) => onYearChange(e.target.value)}>
            <option value="" disabled>
              Year
            </option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </details>
    </div>
  );
}
