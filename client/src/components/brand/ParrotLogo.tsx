/**
 * The ResumeLingo parrot mark — full name "Polyglot," goes by "Poly." The
 * name/story lives as real page copy on the Hero section (see Hero.tsx's
 * hero-mascot-caption), not just this image's hover tooltip — tooltips
 * don't reach mobile (no hover state) or screen readers. This renders the
 * exact approved source image (client/public/brand/parrot-logo-7.png, native
 * 828x732px, transparent background) rather than a hand-drawn SVG
 * recreation. Earlier SVG attempts at "recreating" this shape kept drifting
 * from the original (proportions, curve shapes), so this is the actual
 * pixels, scaled but never reshaped: width/height are locked to the image's
 * real 828:732 aspect ratio, so passing `size` (treated as width) can't
 * stretch or distort it.
 *
 * A replacement mark (parrot-logo-5.png) was tried and shipped briefly in
 * Aug 2026, then reverted back to this artwork after it read as less
 * polished on the actual site. On reverting, a real defect in this
 * artwork's own file (parrot-logo-4.png) surfaced: its semi-transparent
 * edge pixels still carried pure-white RGB values left over from the
 * original matte, which showed up as a faint white halo around the whole
 * shape against any non-white background (very visible on the Hero
 * section's colored gradient). Fixed by decontaminating those edge pixels
 * (unmultiplying each partial-alpha pixel's color assuming a white
 * original matte, recovering its true color instead of a white-blended
 * one) — parrot-logo-7.png is that corrected version, same artwork and
 * dimensions, clean edges.
 *
 * Filename increments ("-2", "-3", "-4", "-5", ...) because the /public
 * mount doesn't allow overwriting a previously-written file in place — each
 * image update lands as a new file, with the previous one deleted
 * separately.
 */
const NATIVE_WIDTH = 828;
const NATIVE_HEIGHT = 732;

interface ParrotLogoProps {
  size?: number;
  /**
   * True (default) when the mark sits right next to visible "ResumeLingo"
   * text (Navbar, Footer) — that adjacent text is what a screen reader
   * should announce, so the image itself stays out of the accessibility
   * tree (empty alt + aria-hidden) rather than doubling up. Set to false
   * when Poly appears on their own with no adjacent brand text (e.g. the
   * Hero mascot) so they get a real, meaningful alt instead of being
   * silently skipped.
   */
  decorative?: boolean;
}

export function ParrotLogo({ size = 140, decorative = true }: ParrotLogoProps) {
  return (
    <img
      src="/brand/parrot-logo-7.png"
      alt={decorative ? "" : "Poly (short for Polyglot), the ResumeLingo parrot mascot"}
      aria-hidden={decorative ? "true" : undefined}
      title="Poly"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
