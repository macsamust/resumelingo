/**
 * The ResumeLingo parrot mark. This renders the exact approved source
 * image (client/public/brand/parrot-logo-2.png, native 779x676px,
 * transparent background — no crest, per the latest approved crop)
 * rather than a hand-drawn SVG recreation. Earlier SVG attempts at
 * "recreating" this shape kept drifting from the original (proportions,
 * curve shapes), so this is the actual pixels, scaled but never reshaped:
 * width/height are locked to the image's real 779:676 aspect ratio, so
 * passing `size` (treated as width) can't stretch or distort it.
 *
 * Filename is "-2" because the /public mount doesn't allow overwriting a
 * previously-written file in place — each image update lands as a new
 * file rather than replacing the old one.
 */
const NATIVE_WIDTH = 779;
const NATIVE_HEIGHT = 676;

export function ParrotLogo({ size = 140 }: { size?: number }) {
  return (
    <img
      src="/brand/parrot-logo-2.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={(size * NATIVE_HEIGHT) / NATIVE_WIDTH}
      style={{ display: "block" }}
    />
  );
}
