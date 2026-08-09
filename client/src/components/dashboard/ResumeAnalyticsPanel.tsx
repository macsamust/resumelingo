import { Link } from "react-router-dom";
import { ResumeAnalytics } from "../../types";

/**
 * Premium-only "Resume Analytics" section (Dashboard) — everything here
 * comes straight from DashboardSummary.resumeAnalytics (see server's
 * DashboardController.buildResumeAnalytics()): strength distribution,
 * section gaps, staleness, a 14-day view trend, a strength-score trend,
 * recurring missing ATS Check keywords, and a strongest-vs-weakest
 * comparison. Purely a display component — all the math already happened
 * server-side.
 */
export function ResumeAnalyticsPanel({ analytics }: { analytics: ResumeAnalytics }) {
  const { strengthDistribution, sectionGaps, staleResumes, viewTrend, scoreTrend, recurringMissingKeywords, comparison } =
    analytics;
  const maxDailyViews = Math.max(1, ...viewTrend.daily.map((d) => d.count));
  const viewDelta = viewTrend.thisWeek - viewTrend.lastWeek;

  return (
    <div className="builder-panel" style={{ marginTop: 36, marginBottom: 36 }}>
      <h2>Resume Analytics</h2>
      <p className="hero-note" style={{ marginBottom: 20 }}>
        A closer look across all of your resumes — updates automatically as you edit and share them.
      </p>

      <div className="analytics-section">
        <h3 className="analytics-subhead">Strength score distribution</h3>
        <div className="analytics-distribution">
          <span className="resume-template-tag strength-tag-high">Strong (80+): {strengthDistribution.strong}</span>
          <span className="resume-template-tag strength-tag-medium">
            Moderate (50–79): {strengthDistribution.moderate}
          </span>
          <span className="resume-template-tag strength-tag-low">
            Needs work (&lt;50): {strengthDistribution.needsWork}
          </span>
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="analytics-subhead">Views, last 14 days</h3>
        <p className="hero-note" style={{ marginBottom: 10 }}>
          {viewTrend.thisWeek} view{viewTrend.thisWeek === 1 ? "" : "s"} this week
          {viewTrend.lastWeek > 0 || viewTrend.thisWeek > 0 ? (
            <>
              {" "}
              ({viewDelta === 0 ? "flat" : `${viewDelta > 0 ? "+" : ""}${viewDelta}`} vs. {viewTrend.lastWeek} last week)
            </>
          ) : null}
        </p>
        <div className="analytics-bars">
          {viewTrend.daily.map((d) => (
            <div className="analytics-bar-col" key={d.date} title={`${d.date}: ${d.count} view${d.count === 1 ? "" : "s"}`}>
              <div className="analytics-bar" style={{ height: `${Math.max(4, (d.count / maxDailyViews) * 48)}px` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="analytics-section">
        <h3 className="analytics-subhead">Strength score trend, last 30 days</h3>
        <p className="hero-note" style={{ marginBottom: scoreTrend.improved.length > 0 ? 10 : 0 }}>
          {scoreTrend.averageDelta === 0
            ? "No meaningful change across your resumes in this window."
            : `Averaging ${scoreTrend.averageDelta > 0 ? "+" : ""}${scoreTrend.averageDelta} points across your resumes.`}
        </p>
        {scoreTrend.improved.length > 0 && (
          <ul className="preview-bullets">
            {scoreTrend.improved.map((r) => (
              <li key={r.resumeId}>
                "{r.title}" is up {r.delta} point{r.delta === 1 ? "" : "s"}.
              </li>
            ))}
          </ul>
        )}
      </div>

      {sectionGaps.length > 0 && (
        <div className="analytics-section">
          <h3 className="analytics-subhead">What's missing</h3>
          <ul className="preview-bullets">
            {sectionGaps.map((g) => (
              <li key={g.resumeId}>
                <Link to={`/resumes/${g.resumeId}/edit`}>"{g.title}"</Link> is missing {g.missing.join(", ")}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {recurringMissingKeywords.length > 0 && (
        <div className="analytics-section">
          <h3 className="analytics-subhead">Keywords you keep missing</h3>
          <p className="hero-note" style={{ marginBottom: 10 }}>
            Most-repeated words from job descriptions you've pasted into ATS Check that your resumes don't cover yet.
          </p>
          <div className="ats-keyword-chips">
            {recurringMissingKeywords.map((k) => (
              <span key={k.word} className="ats-chip ats-chip-missing">
                {k.word} × {k.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {staleResumes.length > 0 && (
        <div className="analytics-section">
          <h3 className="analytics-subhead">Could use a refresh</h3>
          <ul className="preview-bullets">
            {staleResumes.map((r) => (
              <li key={r.resumeId}>
                <Link to={`/resumes/${r.resumeId}/edit`}>"{r.title}"</Link> hasn't been updated in {r.daysSinceUpdate}{" "}
                days.
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison && (
        <div className="analytics-section" style={{ marginBottom: 0 }}>
          <h3 className="analytics-subhead">Strongest vs. weakest</h3>
          <p className="hero-note" style={{ marginBottom: comparison.gapDrivers.length > 0 ? 6 : 0 }}>
            "{comparison.strongest.title}" ({comparison.strongest.score}%) is outperforming "{comparison.weakest.title}"
            ({comparison.weakest.score}%).
          </p>
          {comparison.gapDrivers.length > 0 && (
            <p className="hero-note" style={{ marginBottom: 0 }}>
              Closing the gap: add {comparison.gapDrivers.join(", ")} to "{comparison.weakest.title}".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
