/**
 * A "full character" rendering of Poly — distinct from ParrotLogo.tsx's
 * flat head-only mark. ParrotLogo is a logo: designed to read cleanly at
 * small sizes next to text (Navbar, Footer, nav icons). This is an avatar:
 * a front-facing, wings-spread illustration meant to carry a bigger,
 * standalone moment (a genuine empty state, a welcome greeting) where the
 * logo mark alone reads as sparse/orphaned once blown up past ~40px.
 *
 * Source: docs/brand-archive/mascot-explorations-2026-09/ (see that
 * folder's README) — a hand-picked illustration from a set of mascot
 * explorations, background-removed and recolored (green crest -> brand
 * teal, var(--teal) = #14b8a6) via client/public/brand/poly-avatar-1.png.
 * Same "real pixels, not a hand-drawn recreation" reasoning as ParrotLogo.
 */
const NATIVE_WIDTH = 826;
const NATIVE_HEIGHT = 824;

interface PolyAvatarProps {
  size?: number;
  /** See ParrotLogo's identical prop — same reasoning: false when Poly appears with no adjacent text explaining who they are. */
  decorative?: boolean;
}

export function PolyAvatar({ size = 96, decorative = false }: PolyAvatarProps) {
  return (
    <img
      src="/brand/poly-avatar-1.png"
      alt={decorative ? "" : "Poly, the ResumeLingo mascot"}
      aria-hidden={decorative ? "true" : undefined}
      title="Poly"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
