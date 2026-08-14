import type { CSSProperties } from "react";

/**
 * A single shimmering placeholder block — the building block for
 * page-specific skeleton screens (see DashboardSkeleton.tsx for the first
 * one). Renders as a plain rounded rect by default; pass width/height/
 * radius to shape it into a text line, a pill, a circle, etc.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      style={{ display: "inline-block", width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}
