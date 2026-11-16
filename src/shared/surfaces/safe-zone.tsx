/**
 * A dashed ring over an icon preview: the safe zone a maskable icon's
 * artwork stays inside (a circle of `fraction` of the icon's width). Drawn
 * as SVG for Cynosure Image's `overlay`, which stretches it to the picture.
 */
export function SafeZoneRing({ fraction = 0.8 }: { fraction?: number }) {
  const r = 50 * fraction;
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--cy-color-accent-text)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
