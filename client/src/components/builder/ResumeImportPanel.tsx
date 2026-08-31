import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, resumeImportApi } from "../../api";
import { ImportedResumeData } from "../../api/ResumeImportApi";
import { extractResumeText, ResumeImportExtractError } from "../../utils/resumeImportExtract";

interface Props {
  /** Professional/Premium-gated (see worker's ResumeImportController) — caller passes whether the account's tier can use this, so a Starter user sees an upgrade prompt instead of a broken/rejected upload. */
  canImport: boolean;
  onImported: (data: ImportedResumeData) => void;
}

type Status = "idle" | "extracting" | "analyzing" | "error";

/**
 * "Import an existing resume" — top of ResumeBuilderPage's New Resume form.
 * Extracts text from the uploaded file entirely client-side (see
 * utils/resumeImportExtract.ts), sends only that text to the Worker's AI
 * import endpoint, and hands the structured result back to the parent,
 * which prefills the same form fields/editors already on the page — the
 * rest of that page's normal editors *are* the review step, so this
 * component doesn't need its own separate review screen.
 */
export function ResumeImportPanel({ canImport, onImported }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStatus("idle");
    setError(null);
    setNotes([]);
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setNotes([]);
    setStatus("extracting");
    try {
      const text = await extractResumeText(file);
      setStatus("analyzing");
      const { data } = await resumeImportApi.extract(text);
      setNotes(data.notes);
      setStatus("idle");
      onImported(data);
    } catch (err) {
      setStatus("error");
      if (err instanceof ResumeImportExtractError || err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong importing that resume. You can still fill out the form manually below.");
      }
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!canImport) {
    return (
      <div className="builder-panel" style={{ marginBottom: 24 }}>
        <h2>Import an existing resume</h2>
        <p className="hero-note" style={{ marginBottom: 12 }}>
          Upload a resume (PDF, Word, or text) and let AI pull your work history, education, and skills into the form
          below automatically. This requires the Professional or Premium plan.
        </p>
        <Link to="/#pricing" className="btn btn-ghost">
          Upgrade to import a resume
        </Link>
      </div>
    );
  }

  return (
    <div className="builder-panel" style={{ marginBottom: 24 }}>
      <h2>Import an existing resume</h2>
      <p className="hero-note" style={{ marginBottom: 12 }}>
        Upload a resume (PDF, Word .docx, or plain text) and AI will pull your work history, education, and skills
        into the form below. Review and edit everything before saving.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={onFileChange}
        disabled={status === "extracting" || status === "analyzing"}
      />
      {status === "extracting" && (
        <div className="import-status" role="status" aria-live="polite">
          <span className="spinner-ring" aria-hidden="true" />
          Reading {fileName}…
        </div>
      )}
      {status === "analyzing" && (
        <div className="import-status" role="status" aria-live="polite">
          <span className="spinner-ring" aria-hidden="true" />
          Analyzing your resume with AI, this can take up to 30 seconds…
        </div>
      )}
      {status === "error" && error && (
        <div className="form-error" style={{ marginTop: 10 }}>
          {error}{" "}
          <button type="button" className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={reset}>
            Try again
          </button>
        </div>
      )}
      {notes.length > 0 && (
        <div className="empty-state" style={{ marginTop: 12, textAlign: "left" }}>
          <strong>Worth a look:</strong>
          <ul className="preview-bullets" style={{ marginTop: 8 }}>
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
