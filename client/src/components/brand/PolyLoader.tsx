/**
 * Poly's animated "waiting on AI" state — distinct from PolyAvatar.tsx's
 * static full-body image. Used anywhere the app is actually waiting on an
 * AI generation call (achievement/bullet generation, cover letters,
 * thank-you letters), replacing a bare "Generating…" button label with a
 * small animated companion so the wait reads as "Poly is writing this for
 * you" rather than dead air.
 *
 * Source: client/public/brand/poly-loading.gif — a resized (120x120,
 * downscaled from the original 560x560 upload) and re-optimized copy of the
 * animated GIF supplied directly for this purpose, kept small since it's
 * always shown at icon size (~40px) and loops continuously while visible.
 * Same "real pixels, not a hand-drawn recreation" reasoning as
 * ParrotLogo/PolyAvatar — this is not an SVG animation.
 */
const NATIVE_WIDTH = 120;
const NATIVE_HEIGHT = 120;

interface PolyLoaderProps {
  size?: number;
  /** Text shown next to the animation — callers pass their own in-progress copy ("Generating…", "Writing…") rather than this component hardcoding one. */
  label?: string;
}

export function PolyLoader({ size = 40, label }: PolyLoaderProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <img
        src="/brand/poly-loading.gif"
        alt=""
        aria-hidden="true"
        width={size}
        height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
        style={{ display: "block" }}
      />
      {label && (
        <span className="hero-note" style={{ margin: 0 }} role="status">
          {label}
        </span>
      )}
    </span>
  );
}
