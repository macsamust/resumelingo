// Shared by DashboardPage's "My Resumes" last-updated timestamp and
// NotificationBell's recent-view feed — extracted here so both use
// identical relative-time phrasing instead of two near-duplicate copies.

/** Absolute fallback for anything more than ~a month old, so very old timestamps don't show something vague like "8 months ago". */
export const formatUpdatedDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Relative phrasing ("3 days ago") for anything within the last month, falling back to formatUpdatedDate beyond that. */
export const formatRelativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatUpdatedDate(iso);
};
