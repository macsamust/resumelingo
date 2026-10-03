import { CHANGELOG_ENTRIES } from "../data/changelog";

/**
 * Customer-facing "What's New" page — see data/changelog.ts's doc comment
 * for why this exists instead of versioned product relaunches ("ResumeLingo
 * 2.0"). Reuses the Career Center/Full Circle pages' section styling
 * (career-page/career-hero/career-section) rather than inventing new layout
 * classes, since this is the same "one long page of dated cards" shape.
 */
export function ChangelogPage() {
  const monthLabel = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Group by month, keeping the list's newest-first order. The newest month opens by default;
  // earlier months stay collapsed in a monthly accordion so the page doesn't grow into one long scroll.
  const months: { label: string; entries: typeof CHANGELOG_ENTRIES }[] = [];
  for (const entry of CHANGELOG_ENTRIES) {
    const label = monthLabel(entry.date);
    const last = months[months.length - 1];
    if (last && last.label === label) last.entries.push(entry);
    else months.push({ label, entries: [entry] });
  }

  return (
    <main className="career-page">
      <section className="career-hero">
        <div className="wrap">
          <div className="section-head">
            <span className="section-tag">What's New</span>
            <h1>ResumeLingo keeps improving, a little at a time</h1>
            <p>No version numbers to keep track of — just a running list of what's changed, most recent first.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap career-sections">
          {months.map((month, i) => (
            <details className="changelog-month-group" key={month.label} open={i === 0}>
              <summary>
                {month.label} <span className="changelog-month-count">{month.entries.length}</span>
              </summary>
              {month.entries.map((entry) => (
                <article className="career-section changelog-entry" key={`${entry.date}-${entry.title}`}>
                  <span className="changelog-date">
                    {new Date(`${entry.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <h2>{entry.title}</h2>
                  <p className="career-intro">{entry.description}</p>
                </article>
              ))}
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
