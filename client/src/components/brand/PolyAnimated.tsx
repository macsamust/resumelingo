/**
 * Poly's animated expression states — a sibling to PolyAvatar.tsx's static
 * full-body image and PolyLoader.tsx's AI-wait spinner. Used for standalone
 * "moment" spots (a greeting, a celebration) that PolyAvatar previously
 * covered with a still image, where a matching animated expression reads as
 * more alive without introducing a whole new visual style.
 *
 * Source: five animated gifs supplied together (Sep 2026: thinking, happy,
 * wave, sleepy, celebrate), resized from the original ~560px uploads down to
 * 160x160 and re-optimized. "Thinking" went to PolyLoader (see that file's
 * doc comment) since it's specifically the AI-wait state; the other four
 * live here. "Happy" and "sleepy" aren't wired into a surface yet — added
 * for whichever spot needs them next (a returning-user greeting, an empty
 * state) without a fresh asset round-trip. Same "real pixels, not a
 * hand-drawn recreation" reasoning as ParrotLogo/PolyAvatar.
 */
const NATIVE_WIDTH = 160;
const NATIVE_HEIGHT = 160;

export type PolyExpression = "wave" | "celebrate" | "happy" | "sleepy";

interface PolyAnimatedProps {
  expression: PolyExpression;
  size?: number;
  /** See PolyAvatar's identical prop — false when Poly appears with no adjacent text explaining who they are. */
  decorative?: boolean;
}

export function PolyAnimated({ expression, size = 96, decorative = false }: PolyAnimatedProps) {
  return (
    <img
      src={`/brand/poly-${expression}.gif`}
      alt={decorative ? "" : "Poly, the ResumeLingo mascot"}
      aria-hidden={decorative ? "true" : undefined}
      title="Poly"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
