/**
 * The ResumeLingo parrot mark. This renders the exact approved source
 * image (client/public/brand/parrot-logo.png, native 198x179px,
 * transparent background) rather than a hand-drawn SVG recreation —
 * earlier SVG attempts at "recreating" this shape kept drifting from the
 * original (proportions, curve shapes), so this is the actual pixels,
 * scaled but never reshaped: width/height are locked to the image's real
 * 198:179 aspect ratio, so passing `size` (treated as width) can't stretch
 * or distort it.
 */
const NATIVE_WIDTH = 198;
const NATIVE_HEIGHT = 179;

export function ParrotLogo({ size = 140 }: { size?: number }) {
  return (
    <img
      src="/brand/parrot-logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
