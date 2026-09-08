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
 *
 * `large` opts into the untouched native-resolution (560x560) file instead
 * of the 160x160 default — added for the Career Coach page specifically
 * (CJ: "increase the size ... just this one image," after an earlier pass
 * had swapped every gif to full-res and made the small icon uses
 * needlessly heavy). Only `poly-wave-large.gif` exists today; add the
 * matching `-large` file for another expression before passing `large`
 * with it.
 */
const NATIVE_WIDTH = 160;
const NATIVE_HEIGHT = 160;

export type PolyExpression = "wave" | "celebrate" | "happy" | "sleepy";

interface PolyAnimatedProps {
  expression: PolyExpression;
  size?: number;
  /** See PolyAvatar's identical prop — false when Poly appears with no adjacent text explaining who they are. */
  decorative?: boolean;
  /** Use the native 560x560 file instead of the default 160x160 one — see doc comment above. Only "wave" has a `-large` asset today. */
  large?: boolean;
}

export function PolyAnimated({ expression, size = 96, decorative = false, large = false }: PolyAnimatedProps) {
  return (
    <img
      src={`/brand/poly-${expression}${large ? "-large" : ""}.gif`}
      alt={decorative ? "" : "Poly, the ResumeLingo mascot"}
      aria-hidden={decorative ? "true" : undefined}
      title="Poly"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
