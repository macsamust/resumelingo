import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls smoothly to the element matching the URL's #hash whenever it
 * changes. React Router's client-side navigation doesn't trigger the
 * browser's native "jump to anchor" behavior the way a full page load
 * does — a Link like `to="/#pricing"` clicked from another route just
 * lands at the top of the destination page. This hook makes those links
 * (Navbar/Footer's How it works / Features / Pricing / Career Center
 * teaser / Success stories, and CareerCenterPage's per-topic links)
 * actually land on the right section.
 */
export function useHashScroll(): void {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);
}
