interface Props {
  title: string;
  professionLabel: string;
  templateName?: string;
  summary: string;
  bullets: string[];
}

/** Live preview panel — mirrors the "every change updates instantly" feature from the product overview. */
export function ResumePreview({ title, professionLabel, templateName, summary, bullets }: Props) {
  return (
    <div className="preview-panel">
      <h2>{title || "Untitled Resume"}</h2>
      <p className="preview-role">
        {professionLabel}
        {templateName ? ` · ${templateName} template` : ""}
      </p>
      {summary ? (
        <p className="preview-summary">{summary}</p>
      ) : (
        <p className="preview-summary" style={{ color: "var(--muted)", fontStyle: "italic" }}>
          Your AI-generated summary and achievements will appear here once you save.
        </p>
      )}
      {bullets.length > 0 && (
        <ul className="preview-bullets">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
