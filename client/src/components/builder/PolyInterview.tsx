import { FormEvent, useState } from "react";
import { PolyAvatar } from "../brand/PolyAvatar";
import { MonthYearField } from "./MonthYearField";
import { EducationEntry, WorkExperienceEntry } from "../../types";
import { generateId } from "../../utils/id";

interface Props {
  fullName: string;
  onFullNameChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  experience: WorkExperienceEntry[];
  onExperienceChange: (experience: WorkExperienceEntry[]) => void;
  education: EducationEntry[];
  onEducationChange: (education: EducationEntry[]) => void;
  /** Bails out to the classic stacked-accordion form at any point — available on every step, not just up front, since someone might start the interview and decide partway through it's not for them. */
  onSwitchToClassic: () => void;
  /** Called once Work Experience and Education are both settled — hands off to the classic form (already pre-filled) for Template, Awards, and everything else. This component never itself creates the resume. */
  onComplete: () => void;
}

type Step = "info" | "experience-form" | "experience-loop" | "education-form" | "education-loop" | "done";

/** Which of the 4 progress dots is lit — matches the same 4 key sections the classic form's "X of 4 key sections complete" counts (Info, Template, Work Experience, Education are 3 of those 4 plus Achievements; Template has no interview step, so this only ever needs 3 dots plus a 4th for "done"). */
const STEP_DOT: Record<Step, number> = {
  info: 0,
  "experience-form": 1,
  "experience-loop": 1,
  "education-form": 2,
  "education-loop": 2,
  done: 3,
};

function blankExperienceDraft(): WorkExperienceEntry {
  return { id: generateId(), company: "", title: "", startDate: "", endDate: "", current: false };
}

function blankEducationDraft(): EducationEntry {
  return { school: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", current: false };
}

/**
 * "Let Poly interview me" — the alternative to New Resume's classic stacked
 * accordion, covering the same 3 sections (Info, Work Experience, Education)
 * one focused question at a time instead of all at once. Achievements isn't
 * part of this yet (see this component's own follow-up, Phase 2 — the AI-assist
 * cost/latency question there needs its own decision first) and Template/
 * Awards/"Answer a few questions" never will be: onComplete hands off
 * straight to the classic form, already pre-filled, for those.
 *
 * Deliberately skips city/state (Work Experience) here even though
 * ExperienceEditor collects them — sectionProgress.workExperience only
 * checks company+title, and an interview asking for four fields before its
 * first "add another job?" prompt fights the whole point of feeling like a
 * quick back-and-forth rather than a form in a chat costume. Those fields
 * are still there waiting in the classic form afterward for anyone who wants
 * to add them.
 *
 * Reuses MonthYearField (the same date-picker ExperienceEditor/
 * EducationEditor use) rather than a plain text input, but not
 * ExperienceEditor/EducationEditor themselves — those render their own
 * "+ Add" button and per-row move/duplicate/remove chrome, which would let
 * someone add a second entry without ever seeing the "add another job?"
 * loop prompt this component is built around.
 */
export function PolyInterview({
  fullName,
  onFullNameChange,
  title,
  onTitleChange,
  experience,
  onExperienceChange,
  education,
  onEducationChange,
  onSwitchToClassic,
  onComplete,
}: Props) {
  const [step, setStep] = useState<Step>("info");
  const [infoError, setInfoError] = useState<string | null>(null);
  const [draftExperience, setDraftExperience] = useState<WorkExperienceEntry>(blankExperienceDraft());
  const [draftEducation, setDraftEducation] = useState<EducationEntry>(blankEducationDraft());
  // True once someone's tried to move on with zero jobs/schools entered and
  // gotten the one-time nudge — lets a second "that's all" actually proceed
  // instead of nagging forever. Reset whenever a fresh loop starts.
  const [experienceZeroNudge, setExperienceZeroNudge] = useState(false);
  const [educationZeroNudge, setEducationZeroNudge] = useState(false);

  const submitInfo = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setInfoError("Enter your name to continue.");
      return;
    }
    setInfoError(null);
    setStep("experience-form");
  };

  const commitExperience = (e: FormEvent) => {
    e.preventDefault();
    // A blank "Continue" (nothing typed) is treated the same as skipping
    // this entry, not an error — someone realizing mid-form they don't want
    // to add this job shouldn't be stuck unable to move past it.
    if (draftExperience.company.trim() || draftExperience.title.trim()) {
      onExperienceChange([...experience, draftExperience]);
    }
    setStep("experience-loop");
  };

  const addAnotherJob = () => {
    setDraftExperience(blankExperienceDraft());
    setExperienceZeroNudge(false);
    setStep("experience-form");
  };

  const finishExperience = () => {
    if (experience.length === 0 && !experienceZeroNudge) {
      setExperienceZeroNudge(true);
      return;
    }
    setStep("education-form");
  };

  const commitEducation = (e: FormEvent) => {
    e.preventDefault();
    if (draftEducation.school.trim() || draftEducation.degree.trim() || draftEducation.fieldOfStudy.trim()) {
      onEducationChange([...education, draftEducation]);
    }
    setStep("education-loop");
  };

  const addAnotherSchool = () => {
    setDraftEducation(blankEducationDraft());
    setEducationZeroNudge(false);
    setStep("education-form");
  };

  const finishEducation = () => {
    if (education.length === 0 && !educationZeroNudge) {
      setEducationZeroNudge(true);
      return;
    }
    setStep("done");
  };

  return (
    <div className="poly-interview">
      <div className="poly-interview-progress">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`poly-interview-dot ${i <= STEP_DOT[step] ? "is-lit" : ""}`} />
        ))}
      </div>

      {step === "info" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">What's your name, and what role are we building this resume for?</p>
          <form onSubmit={submitInfo}>
            <div className="field">
              <label>Your name</label>
              <input value={fullName} onChange={(e) => onFullNameChange(e.target.value)} placeholder="e.g. Jordan Lee" autoFocus />
            </div>
            <div className="field">
              <label>Resume title</label>
              <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="e.g. Software Engineer Resume" />
            </div>
            {infoError && <p className="form-error">{infoError}</p>}
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="submit" className="btn btn-primary">
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "experience-form" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">
            {experience.length === 0 ? "Tell me about your most recent job." : "What about the one before that?"}
          </p>
          <form onSubmit={commitExperience}>
            <div className="field">
              <label>Company</label>
              <input
                value={draftExperience.company}
                onChange={(e) => setDraftExperience((d) => ({ ...d, company: e.target.value }))}
                placeholder="e.g. Acme Corp"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Title held</label>
              <input
                value={draftExperience.title}
                onChange={(e) => setDraftExperience((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            <div className="experience-dates">
              <MonthYearField
                label="Start date"
                value={draftExperience.startDate}
                onChange={(v) => setDraftExperience((d) => ({ ...d, startDate: v }))}
              />
              <MonthYearField
                label="End date"
                value={draftExperience.endDate ?? ""}
                disabled={draftExperience.current}
                onChange={(v) => setDraftExperience((d) => ({ ...d, endDate: v }))}
              />
            </div>
            <label className="experience-current">
              <input
                type="checkbox"
                checked={draftExperience.current}
                onChange={(e) => setDraftExperience((d) => ({ ...d, current: e.target.checked, endDate: e.target.checked ? null : d.endDate }))}
              />
              I currently work here
            </label>
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="submit" className="btn btn-primary">
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "experience-loop" && (
        <div className="poly-interview-card">
          {experience.length > 0 && (
            <ul className="poly-interview-list">
              {experience.map((job) => (
                <li key={job.id}>
                  {job.title || "Untitled role"}
                  {job.company ? `, ${job.company}` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">
            {experienceZeroNudge
              ? "Nothing added yet — want to add at least one role, or skip work experience entirely?"
              : "Any other roles you'd like on here?"}
          </p>
          <div className="poly-interview-actions">
            <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
              Switch to classic form
            </button>
            <button type="button" className="btn btn-ghost" onClick={finishExperience}>
              {experienceZeroNudge ? "Skip work experience" : "That's all my jobs"}
            </button>
            <button type="button" className="btn btn-primary" onClick={addAnotherJob}>
              {experienceZeroNudge ? "Add a role" : "Add another role"}
            </button>
          </div>
        </div>
      )}

      {step === "education-form" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">{education.length === 0 ? "Where'd you go to school?" : "Any other schools?"}</p>
          <form onSubmit={commitEducation}>
            <div className="field">
              <label>School</label>
              <input
                value={draftEducation.school}
                onChange={(e) => setDraftEducation((d) => ({ ...d, school: e.target.value }))}
                placeholder="e.g. University of Michigan"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Degree</label>
              <input
                value={draftEducation.degree}
                onChange={(e) => setDraftEducation((d) => ({ ...d, degree: e.target.value }))}
                placeholder="e.g. B.S."
              />
            </div>
            <div className="field">
              <label>Field of study</label>
              <input
                value={draftEducation.fieldOfStudy}
                onChange={(e) => setDraftEducation((d) => ({ ...d, fieldOfStudy: e.target.value }))}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="experience-dates">
              <MonthYearField
                label="Start date"
                value={draftEducation.startDate}
                onChange={(v) => setDraftEducation((d) => ({ ...d, startDate: v }))}
              />
              <MonthYearField
                label="End date"
                value={draftEducation.endDate ?? ""}
                disabled={draftEducation.current}
                onChange={(v) => setDraftEducation((d) => ({ ...d, endDate: v }))}
              />
            </div>
            <label className="experience-current">
              <input
                type="checkbox"
                checked={draftEducation.current}
                onChange={(e) => setDraftEducation((d) => ({ ...d, current: e.target.checked, endDate: e.target.checked ? null : d.endDate }))}
              />
              I'm currently enrolled here
            </label>
            <div className="poly-interview-actions">
              <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
                Switch to classic form
              </button>
              <button type="submit" className="btn btn-primary">
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "education-loop" && (
        <div className="poly-interview-card">
          {education.length > 0 && (
            <ul className="poly-interview-list">
              {education.map((school, i) => (
                <li key={i}>
                  {school.school || "Untitled school"}
                  {school.degree ? `, ${school.degree}` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly asks</span>
          </div>
          <p className="poly-interview-question">
            {educationZeroNudge
              ? "Nothing added yet — want to add at least one school, or skip education entirely?"
              : "Any other schools you'd like on here?"}
          </p>
          <div className="poly-interview-actions">
            <button type="button" className="poly-interview-switch" onClick={onSwitchToClassic}>
              Switch to classic form
            </button>
            <button type="button" className="btn btn-ghost" onClick={finishEducation}>
              {educationZeroNudge ? "Skip education" : "That's all my schools"}
            </button>
            <button type="button" className="btn btn-primary" onClick={addAnotherSchool}>
              {educationZeroNudge ? "Add a school" : "Add another school"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="poly-interview-card">
          <div className="poly-interview-asker">
            <PolyAvatar size={32} decorative />
            <span>Poly says</span>
          </div>
          <p className="poly-interview-question">
            Nice, that's your resume's backbone. Pick a template next, and add anything else you want from there.
          </p>
          <div className="poly-interview-actions">
            <span aria-hidden="true" />
            <button type="button" className="btn btn-primary" onClick={onComplete}>
              Continue to template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
