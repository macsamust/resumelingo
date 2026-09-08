/**
 * Poly's animated "waiting on AI" state — distinct from PolyAvatar.tsx's
 * static full-body image. Used anywhere the app is actually waiting on an
 * AI generation call (achievement/bullet generation, cover letters,
 * thank-you letters), replacing a bare "Generating…" button label with a
 * small animated companion so the wait reads as "Poly is writing this for
 * you" rather than dead air.
 *
 * Source: client/public/brand/poly-thinking.gif — one of five animated
 * expression gifs supplied together (Sep 2026: thinking/happy/wave/
 * sleepy/celebrate), resized from the original ~560px uploads down to
 * 160x160 and re-optimized, same as the earlier one-off wave-in gif this
 * replaces (poly-loading.gif). "Thinking" (eyes up, small thought bubble)
 * was the natural fit for an AI-generation wait state out of the five.
 * Kept small since it's always shown at icon size (~40px) and loops
 * continuously while visible. Same "real pixels, not a hand-drawn
 * recreation" reasoning as ParrotLogo/PolyAvatar — this is not an SVG
 * animation.
 */
const NATIVE_WIDTH = 160;
const NATIVE_HEIGHT = 160;

interface PolyLoaderProps {
  size?: number;
  /** Text shown next to the animation — callers pass their own in-progress copy ("Generating…", "Writing…") rather than this component hardcoding one. */
  label?: string;
}

export function PolyLoader({ size = 40, label }: PolyLoaderProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <img
        src="/brand/poly-thinking.gif"
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
