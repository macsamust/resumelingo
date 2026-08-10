/**
 * The ResumeLingo parrot mark — one component, two render modes, so the
 * shape only ever has to be defined/tuned in one place instead of drifting
 * between a "hero" version and a "favicon" version over time.
 *
 * - variant="full" — the approved multi-color mark (graduated bullet-dot
 *   crest in amber/indigo/teal, chevron beak, teal wing sweep). Use where
 *   there's room to render real detail: marketing pages, a brand section,
 *   print/export headers.
 * - variant="mono" — collapses the crest + beak + wing + body to a single
 *   `color` (default `currentColor`, so it inherits text/icon color like
 *   any other inline icon), with the eye rendered as a punched-through
 *   `eyeColor` circle for a bit of life at tiny sizes. This is the one to
 *   use for favicons, app icons, or anywhere under ~32px where the
 *   full-color version turns to mush.
 *
 * The viewBox (0 -32 160 190, i.e. a 160:190 aspect ratio) is the locked
 * proportion for this mark — cropped tight to the beak/crest/wing bounds,
 * no tail flourish. Don't hand-roll a second copy of these paths; resize
 * via the `size` prop instead.
 */
interface ParrotLogoProps {
  size?: number;
  variant?: "full" | "mono";
  color?: string;
  eyeColor?: string;
}

export function ParrotLogo({ size = 140, variant = "full", color = "currentColor", eyeColor = "#ffffff" }: ParrotLogoProps) {
  const bodyFill = variant === "full" ? "#4f46e5" : color;
  const wingFill = variant === "full" ? "#14b8a6" : color;
  const crestFillOuter = variant === "full" ? "#fbbf24" : color;
  const crestFillMid = variant === "full" ? "#4f46e5" : color;
  const crestFillInner = variant === "full" ? "#14b8a6" : color;
  const beakFill = variant === "full" ? "#fbbf24" : color;
  const eyeIrisFill = variant === "full" ? "#ffffff" : eyeColor;
  const eyePupilFill = variant === "full" ? "#0f172a" : color;

  return (
    <svg width={size} height={(size * 190) / 160} viewBox="0 -32 160 190" aria-hidden="true">
      <circle cx="92" cy="-16" r="11" fill={crestFillOuter} />
      <circle cx="72" cy="-10" r="9" fill={crestFillMid} />
      <circle cx="54" cy="0" r="7" fill={crestFillInner} />
      <path
        d="M12,30 Q12,18 24,18 L118,18 Q130,18 130,30 L130,140 Q130,152 118,152 L24,152 Q12,152 12,140 Z"
        fill={bodyFill}
      />
      {variant === "full" && <path d="M106,18 L130,18 L130,40 Z" fill="#14b8a6" />}
      <path d="M130,55 Q152,95 130,140" fill="none" stroke={wingFill} strokeWidth="9" strokeLinecap="round" />
      <circle cx="52" cy="70" r="11" fill={eyeIrisFill} />
      <circle cx="54" cy="70" r="4.5" fill={eyePupilFill} />
      <path d="M6,66 L28,78 L6,90 Z" fill={beakFill} />
    </svg>
  );
}
