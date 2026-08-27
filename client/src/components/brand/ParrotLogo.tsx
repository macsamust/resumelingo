/**
 * The ResumeLingo parrot mark — nicknamed "Poly". This renders the exact
 * approved source image (client/public/brand/parrot-logo-4.png, native
 * 828x732px, transparent background) rather than a hand-drawn SVG
 * recreation. Earlier SVG attempts at "recreating" this shape kept drifting
 * from the original (proportions, curve shapes), so this is the actual
 * pixels, scaled but never reshaped: width/height are locked to the image's
 * real 828:732 aspect ratio, so passing `size` (treated as width) can't
 * stretch or distort it.
 *
 * Filename increments ("-2", "-3", "-4", ...) because the /public mount
 * doesn't allow overwriting a previously-written file in place — each
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
      src="/brand/parrot-logo-4.png"
      alt={decorative ? "" : "Poly, the ResumeLingo parrot mascot"}
      aria-hidden={decorative ? "true" : undefined}
      title="Hello, I am Poly"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
