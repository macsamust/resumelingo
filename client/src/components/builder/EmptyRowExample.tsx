interface ExampleField {
  label: string;
  value: string;
}

interface Props {
  fields: ExampleField[];
}

/**
 * A static, non-interactive preview shown in place of a list editor's rows
 * before the user has added any entry yet (Work Experience, Education,
 * Awards, Key Achievements, References). Lets someone see the whole shape
 * of one entry — every field at once — instead of discovering it
 * field-by-field via placeholder text only after clicking "+ Add". Purely
 * illustrative: nothing here is a real input, it's never included in what
 * gets saved, and it disappears the instant a real entry exists.
 */
export function EmptyRowExample({ fields }: Props) {
  return (
    <div className="empty-row-example">
      <span className="empty-row-example-tag">Example</span>
      <div className="empty-row-example-grid">
        {fields.map((f) => (
          <div key={f.label} className="empty-row-example-field">
            <div className="empty-row-example-field-label">{f.label}</div>
            <div className="empty-row-example-field-value">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
