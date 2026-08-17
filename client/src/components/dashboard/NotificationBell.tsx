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
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
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
          <div className="notification-bell-header">Recent views</div>
          <ul className="notification-bell-list">
            {recentViews.map((v, i) => (
              <li key={`${v.resumeId}-${v.viewedAt}-${i}`}>
                <span>
                  Someone viewed <strong>{v.title}</strong>
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
