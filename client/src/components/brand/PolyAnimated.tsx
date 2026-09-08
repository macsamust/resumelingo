/**
 * Poly's animated expression states — a sibling to PolyAvatar.tsx's static
 * full-body image and PolyLoader.tsx's AI-wait spinner. Used for standalone
 * "moment" spots (a greeting, a celebration) that PolyAvatar previously
 * covered with a still image, where a matching animated expression reads as
 * more alive without introducing a whole new visual style.
 *
 * Source: five animated gifs supplied together (Sep 2026: thinking, happy,
 * wave, sleepy, celebrate) at their original native 560x560 resolution —
 * initially shipped downscaled to 160x160, but CJ asked for full-size Poly
 * on the Career Coach page (a genuine standalone moment, not an icon), and
 * upscaling a 160px source to that size in CSS looked soft/blurry, so the
 * shipped files were swapped back to full native res (chroma-keyed
 * transparent, same as the 160px versions were). "Thinking" went to
 * PolyLoader (see that file's doc comment) since it's specifically the
 * AI-wait state; the other four live here. "Happy" and "sleepy" aren't
 * wired into a surface yet. Same "real pixels, not a hand-drawn recreation"
 * reasoning as ParrotLogo/PolyAvatar.
 *
 * Trade-off worth knowing: these are now 430-920KB each (vs. ~170-280KB at
 * 160x160) since nothing here is compressed for icon-sized use — every
 * caller downloads the same full-res file regardless of the `size` it
 * renders at (DynamicQuestionForm's 32px wave included). Revisit with a
 * dedicated small variant if that ever shows up as a real load-time issue.
 */
const NATIVE_WIDTH = 560;
const NATIVE_HEIGHT = 560;

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
