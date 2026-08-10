/**
 * Full-color parrot mascot — the fuller "option 2" lockup mark (graduated
 * bullet-dot crest, chevron beak, teal wing sweep, bullet-dot tail),
 * without the "ResumeLingo" wordmark baked in since callers already show
 * that as real text next to/below it. Used where there's room for full
 * detail (Hero) — see ParrotMark.tsx for the simplified single-color
 * silhouette used at small badge/favicon sizes.
 */
export function ParrotMascot({ size = 140 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 205) / 180} viewBox="-20 -35 180 205" aria-hidden="true">
      <circle cx="92" cy="-16" r="11" fill="#fbbf24" />
      <circle cx="72" cy="-10" r="9" fill="#4f46e5" />
      <circle cx="54" cy="0" r="7" fill="#14b8a6" />
      <path
        d="M12,30 Q12,18 24,18 L118,18 Q130,18 130,30 L130,140 Q130,152 118,152 L24,152 Q12,152 12,140 Z"
        fill="#4f46e5"
      />
      <path d="M106,18 L130,18 L130,40 Z" fill="#14b8a6" />
      <path d="M130,55 Q152,95 130,140" fill="none" stroke="#14b8a6" strokeWidth="9" strokeLinecap="round" />
      <circle cx="52" cy="70" r="11" fill="#ffffff" />
      <circle cx="54" cy="70" r="4.5" fill="#0f172a" />
      <path d="M6,66 L28,78 L6,90 Z" fill="#fbbf24" />
      <circle cx="2" cy="152" r="5" fill="#14b8a6" />
      <circle cx="-10" cy="160" r="4" fill="#4f46e5" />
    </svg>
  );
}
