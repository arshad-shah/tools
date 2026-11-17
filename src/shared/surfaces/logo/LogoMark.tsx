/** The mark's tile and glyph: dark in both themes (literal on purpose). */
export const LOGO_TILE = '#0c0e12';
export const LOGO_GLYPH = '#e8ebf0';
/** The caret: tools' accent (src/theme/tools-theme.ts). */
const LOGO_ACCENT = 'var(--cy-color-accent)';

interface LogoMarkProps {
  /** Side in CSS px. */
  size?: number;
  label?: string;
}

/** Caret tile for favicon, app icon and OG image. */
export function LogoMark({ size = 24, label }: LogoMarkProps) {
  const px = size;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true, focusable: false })}
    >
      {label ? <title>{label}</title> : null}
      <rect x="1" y="1" width="22" height="22" rx="6" fill={LOGO_TILE} />
      <rect x="13" y="6" width="5" height="12" rx="1" fill={LOGO_ACCENT} />
      <path
        d="M6 9l3 3-3 3"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke={LOGO_GLYPH}
      />
    </svg>
  );
}
LogoMark.displayName = 'LogoMark';
