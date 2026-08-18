/**
 * The ResumeLingo parrot mark. This renders the exact approved source
 * image (client/public/brand/parrot-logo-4.png, native 828x732px,
 * transparent background) rather than a hand-drawn SVG recreation.
 * Earlier SVG attempts at "recreating" this shape kept drifting from the
 * original (proportions, curve shapes), so this is the actual pixels,
 * scaled but never reshaped: width/height are locked to the image's real
 * 828:732 aspect ratio, so passing `size` (treated as width) can't stretch
 * or distort it.
 *
 * Filename increments ("-2", "-3", "-4", ...) because the /public mount
 * doesn't allow overwriting a previously-written file in place — each
 * image update lands as a new file, with the previous one deleted
 * separately.
 */
const NATIVE_WIDTH = 828;
const NATIVE_HEIGHT = 732;

export function ParrotLogo({ size = 140 }: { size?: number }) {
  return (
    <img
      src="/brand/parrot-logo-4.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
