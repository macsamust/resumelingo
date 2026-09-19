import { useEffect, useRef, useState } from "react";
import { formatRelativeTime } from "../../utils/time";

export interface RecentView {
  resumeId: string;
  title: string;
  viewedAt: string;
}

/**
 * Dashboard header bell showing recent Recruiter Mode views ("Someone
 * viewed [Resume Title] 10 minutes ago") — sourced from the resume_views
 * event log DashboardController already aggregates for Resume Analytics,
 * filtered server-side to just Recruiter-Mode-enabled resumes (see
 * DashboardSummary.recentViews). In-app only for now, not email — no
 * email-sending capability exists anywhere in this app yet (checked before
 * building this), so email notifications would be a separate, larger
 * follow-up rather than something this bell can piggyback on.
 *
 * No "mark as read" persistence — every load just shows the most recent
 * views returned by the server. Simple by design, matching the "lighter"
 * framing this feature was scoped with.
 */
interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

const DROPDOWN_MAX_WIDTH = 300;
const VIEWPORT_MARGIN = 16;

/**
 * Sep 2026 QA pass (UX-05): DashboardController.buildRecentViews returns up
 * to 10 raw view events, newest first — the same resume viewed twice in
 * quick succession (a real, common case for Recruiter Mode: someone opens
 * the link, then reopens it later the same day) shows as two rows whose
 * relative-time text often rounds to the exact same string ("7 days ago"
 * twice), reading as a display bug rather than two real events. Collapsing
 * consecutive same-resume rows into one, with a "×N" count and the most
 * recent timestamp, both fixes that and stops one frequently-viewed resume
 * from crowding all 10 slots and hiding views of everything else.
 */
function collapseConsecutive(views: RecentView[]): (RecentView & { count: number })[] {
  const collapsed: (RecentView & { count: number })[] = [];
  for (const v of views) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.resumeId === v.resumeId) {
      last.count += 1;
      // Rows arrive newest-first, so the first one seen per group is
      // already the most recent — nothing to update on the merge.
    } else {
      collapsed.push({ ...v, count: 1 });
    }
  }
  return collapsed;
}

export function NotificationBell({ recentViews }: { recentViews: RecentView[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Capture phase (the `true` below), not bubble — several dashboard
    // controls (the resume kebab menu's own trigger, notably) call
    // e.stopPropagation() in their own click handler to manage their own
    // open/closed state. A bubble-phase listener here never sees a click
    // that was stopped before it bubbled up to `document`, so clicking the
    // kebab while this dropdown was open used to leave both open at once,
    // with this dropdown's higher z-index visually covering Clone/Delete
    // underneath (Sep 2026 QA pass, UX-05). Capture fires top-down before
    // any bubble-phase stopPropagation takes effect, so this always sees
    // the click regardless of what the clicked element does with it after.
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Positioned in JS off the trigger's real bounding box rather than a pure
  // CSS anchor (e.g. "right: 0" relative to the bell) — the bell sits
  // *before* the "+ New Resume" button in the header, not flush against the
  // viewport's right edge, so a CSS-only anchor can put the dropdown well
  // past the left edge on narrow phones. Recomputed on resize/orientation
  // change too, since the trigger's position shifts with the viewport.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(DROPDOWN_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
      const left = Math.min(Math.max(rect.right - width, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN));
      const top = rect.bottom + 8;
      setPosition({ top, left, width });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("orientationchange", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("orientationchange", reposition);
    };
  }, [open]);

  if (recentViews.length === 0) return null;

  const grouped = collapseConsecutive(recentViews);
  // The badge shows the raw event count (matching the server's "last 10
  // events" cap), which reads as permanently stuck at 10 for any resume
  // with steady traffic — the header line below spells out that it's the
  // most recent 10, not an unread count, so the number isn't mistaken for
  // one that should go down or vary the way an actual unread badge would.

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`${recentViews.length} recent resume view${recentViews.length === 1 ? "" : "s"}`}
        title="Recent views of your Recruiter Mode resumes"
      >
        <span aria-hidden="true">&#128276;</span>
        <span className="notification-bell-badge">{recentViews.length}</span>
      </button>
      {open && position && (
        <div
          className="notification-bell-dropdown"
          style={{ top: position.top, left: position.left, width: position.width }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="notification-bell-header">Most recent {recentViews.length} Recruiter Mode views</div>
          <ul className="notification-bell-list">
            {grouped.map((v, i) => (
              <li key={`${v.resumeId}-${v.viewedAt}-${i}`}>
                <span>
                  Someone viewed <strong>{v.title}</strong>
                  {v.count > 1 ? ` ×${v.count}` : ""}
                </span>
                <span className="hero-note">{formatRelativeTime(v.viewedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
