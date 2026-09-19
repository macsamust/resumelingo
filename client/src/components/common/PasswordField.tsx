import { InputHTMLAttributes, useState } from "react";

/**
 * Drop-in replacement for a plain `<div className="field"><label/><input
 * type="password"/></div>` block, adding a show/hide eye-icon toggle. Built
 * app-wide (CJ, Sep 2026: "Every password field, app-wide") after confirming
 * no such pattern existed anywhere in the app — every password input used to
 * be a bare `type="password"` with no way to double-check what was typed.
 *
 * Unlike the earlier-rejected "confirm password" field idea, this has no
 * autofill-duplication failure mode and is standard practice elsewhere, so
 * it was added everywhere at once rather than scoped to just Signup.
 *
 * Renders its own `.field` wrapper and `<label>`, so callers swap
 * `<div className="field">...</div>` for `<PasswordField label="..." .../>`
 * directly — all other input props (value, onChange, required, minLength,
 * autoComplete, placeholder, autoFocus, id, etc.) pass straight through to
 * the underlying `<input>`. `type` is intentionally not accept-able as a
 * prop since this component owns that toggle.
 */
interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function PasswordField({ label, className, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label>{label}</label>
      <div className="password-field-wrap">
        <input {...inputProps} type={visible ? "text" : "password"} className={className} />
        <button
          type="button"
          className="password-field-toggle"
          onClick={() => setVisible((v) => !v)}
          // Doesn't steal tab focus away from the password input into the
          // toggle on the way to the next real field — same reasoning as
          // ResumeQrCode's download button not being part of the tab order
          // of the main form.
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
