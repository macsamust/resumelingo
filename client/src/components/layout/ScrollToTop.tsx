import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the window's scroll position to the top on every route change —
 * matching how a normal multi-page site behaves on a fresh navigation.
 * React Router's client-side routing doesn't do this on its own: clicking a
 * nav link just swaps the page content in place and leaves the browser's
 * scroll offset wherever it was on the previous page. Most pages hide this
 * (any leftover offset still looks like "the top"), but a long page like
 * Career Center makes it obvious — navigating there from a page you'd
 * scrolled partway down on can land you mid-page, e.g. on the Salary
 * Negotiation section instead of the page's own title.
 *
 * Skips the reset when the destination URL has a #hash — useHashScroll.ts
 * owns scrolling to a specific anchor in that case (e.g. footer links,
 * Dashboard's per-topic Career Center cards), and this would fight it.
 */
export function ScrollToTop(): null {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
