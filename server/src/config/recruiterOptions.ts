export interface RecruiterOption {
  value: string;
  label: string;
}

/**
 * Dropdown options for the Recruiter Mode fields on Edit Resume — mirrored
 * exactly in client/src/config/recruiterOptions.ts so the edit form and the
 * public candidate card always agree on labels. "" (empty string) means
 * "not specified" and is never rendered on the public card.
 */
export const CLEARANCE_OPTIONS: RecruiterOption[] = [
  { value: "", label: "Not specified" },
  { value: "none", label: "None" },
  { value: "public-trust", label: "Public Trust" },
  { value: "secret", label: "Secret" },
  { value: "top-secret", label: "Top Secret" },
  { value: "top-secret-sci", label: "Top Secret/SCI" },
  { value: "other", label: "Other" },
];

export const WORK_AUTHORIZATION_OPTIONS: RecruiterOption[] = [
  { value: "", label: "Not specified" },
  { value: "us-citizen", label: "U.S. Citizen" },
  { value: "green-card", label: "Green Card / Permanent Resident" },
  { value: "no-sponsorship-needed", label: "Authorized to work — no sponsorship needed" },
  { value: "visa-sponsorship-needed", label: "Visa sponsorship needed" },
  { value: "other", label: "Other" },
];

export const REMOTE_PREFERENCE_OPTIONS: RecruiterOption[] = [
  { value: "", label: "Not specified" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
  { value: "flexible", label: "Flexible" },
];

export function recruiterOptionLabel(options: RecruiterOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
