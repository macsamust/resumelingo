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
 * sleepy/celebrate) at native 560x560 resolution (see PolyAnimated's doc
 * comment for why these ship full-size rather than pre-shrunk for icon
 * use), same as the earlier one-off wave-in gif this replaces
 * (poly-loading.gif). "Thinking" (eyes up, small thought bubble) was the
 * natural fit for an AI-generation wait state out of the five. Always
 * *shown* at icon size (~40px) via the `size` prop/CSS even though the
 * downloaded file is full-res. Same "real pixels, not a hand-drawn
 * recreation" reasoning as ParrotLogo/PolyAvatar — this is not an SVG
 * animation.
 */
const NATIVE_WIDTH = 560;
const NATIVE_HEIGHT = 560;

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
