/**
 * Small, flat U.S. flag used by the "Military Service" badge on a resume (see
 * ResumePreview's militaryBadgeBlock). Inline SVG rather than the flag emoji
 * so it renders identically everywhere: Windows shows the emoji as the
 * letters "US", and an <img> would need a separate asset. Seven stripes and a
 * dotted canton are a deliberate simplification at badge size, drawn flat and
 * upright, never waved or recolored.
 */
export function AmericanFlag({ width = 19 }: { width?: number }) {
  const height = (width * 10) / 19;
  const stars: JSX.Element[] = [];
  const rows = [
    { y: 1, xs: [1.2, 2.9, 4.6, 6.3] },
    { y: 2.7, xs: [2, 3.7, 5.4] },
    { y: 4.3, xs: [1.2, 2.9, 4.6, 6.3] },
  ];
  for (const row of rows) for (const x of row.xs) stars.push(<circle key={`${row.y}-${x}`} cx={x} cy={row.y} r={0.28} fill="#fff" />);
  return (
    <svg width={width} height={height} viewBox="0 0 19 10" role="img" aria-label="United States flag" className="tpl-military-flag">
      <rect width="19" height="10" fill="#fff" />
      {[0, 1.54, 3.08, 4.62, 6.15, 7.69, 9.23].map((y) => (
        <rect key={y} y={y} width="19" height="0.77" fill="#b22234" />
      ))}
      <rect width="7.6" height="5.38" fill="#3c3b6e" />
      {stars}
    </svg>
  );
}
