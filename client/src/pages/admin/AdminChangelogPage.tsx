import { Fragment, useMemo, useState } from "react";
import { AdminShell } from "../../components/layout/AdminShell";
import { ADMIN_CHANGELOG_ENTRIES } from "../../data/adminChangelog";

/** Splits on backtick-delimited spans and wraps the odd-indexed segments in <code> — the entries below are transcribed straight from session-log.md's markdown table, which uses backticks constantly for file/commit references. */
function renderWithInlineCode(text: string) {
  return text.split("`").map((segment, i) =>
    i % 2 === 1 ? (
      <code key={i} className="admin-changelog-code">
        {segment}
      </code>
    ) : (
      <Fragment key={i}>{segment}</Fragment>
    )
  );
}

/**
 * Admin-only, unfiltered changelog — every entry from docs/ops/session-log.md,
 * no matter how small (CJ, Sep 2026: "This log will identify every single
 * change no matter the size or impact"). The counterpart to the curated,
 * subscriber-facing /whats-new page (ChangelogPage.tsx) — that one applies
 * an inclusion bar ("would a subscriber actually care"); this one applies
 * none. See data/adminChangelog.ts's doc comment for how the two files
 * (this one and session-log.md) stay in sync.
 */
export function AdminChangelogPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = q
      ? ADMIN_CHANGELOG_ENTRIES.filter((e) => e.topic.toLowerCase().includes(q) || e.outcome.toLowerCase().includes(q) || e.id.toLowerCase() === q)
      : ADMIN_CHANGELOG_ENTRIES;
    // Newest first for display — the source array (and session-log.md) is
    // kept in ascending/chronological order since that's how new rows get
    // appended.
    return entries.slice().reverse();
  }, [query]);

  return (
    <AdminShell>
      <div className="app-page-head">
        <h1>
          Changelog <span className="app-page-head-count">({ADMIN_CHANGELOG_ENTRIES.length})</span>
        </h1>
      </div>
      <p className="hero-note admin-plan-warning">
        Every change made to ResumeLingo, no matter the size — the unfiltered companion to the public "What's New"
        page (which only shows what a subscriber would actually care about). Mirrors{" "}
        <code className="admin-changelog-code">docs/ops/session-log.md</code> in the repo.
      </p>
      <div className="admin-audit-filters">
        <input
          type="text"
          placeholder="Search by keyword or ID (e.g. R017)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: 280 }}
        />
        {query && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setQuery("")}>
            Clear
          </button>
        )}
      </div>
      <div className="admin-changelog-list">
        {filtered.map((entry) => (
          <div className="admin-changelog-entry" key={entry.id}>
            <div className="admin-changelog-entry-head">
              <span className="admin-changelog-id">{entry.id}</span>
              <span className="hero-note">{new Date(`${entry.date}T00:00:00`).toLocaleDateString()}</span>
            </div>
            <p className="admin-changelog-topic">{renderWithInlineCode(entry.topic)}</p>
            <p className="admin-changelog-outcome">{renderWithInlineCode(entry.outcome)}</p>
          </div>
        ))}
        {filtered.length === 0 && <p className="hero-note">No entries match "{query}".</p>}
      </div>
    </AdminShell>
  );
}
