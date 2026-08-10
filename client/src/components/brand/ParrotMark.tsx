/**
 * Small single-color parrot silhouette — the icon that sits inside the
 * gradient logo badge in Navbar/Footer, replacing the old plain "R"
 * letter. Deliberately simplified (no fold-corner detail, no multi-color
 * crest) since fine detail disappears at the ~20-30px size this renders
 * at — see ParrotMascot.tsx for the full-detail version used at larger
 * sizes. `color` is the silhouette fill, `eyeColor` is the one accent dot
 * (needs to contrast against both `color` and whatever sits behind it).
 */
export function ParrotMark({
  size = 19,
  color = "#ffffff",
  eyeColor = "#0f172a",
}: {
  size?: number;
  color?: string;
  eyeColor?: string;
}) {
  return (
    <svg width={size} height={(size * 24) / 20} viewBox="0 0 20 24" aria-hidden="true">
      <circle cx="8" cy="2.5" r="1.5" fill={color} />
      <circle cx="10.5" cy="1" r="1.9" fill={color} />
      <circle cx="13" cy="2" r="1.3" fill={color} />
      <rect x="4" y="5.5" width="13" height="15" rx="3" fill={color} />
      <path d="M17,8 Q21,14 17,20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M0,9.5 L6,12 L0,14.5 Z" fill={color} />
      <circle cx="9" cy="11.5" r="1.6" fill={eyeColor} />
    </svg>
  );
}
