import { CARET, LOGO_GLYPHS, LOGO_HEIGHT } from './logo-paths';
import './logo.css';

interface LogoProps {
  /** 'full': mint caret. 'mono': caret in the text colour (print). */
  variant?: 'full' | 'mono';
  /** Blink the caret three times (only when motion is allowed). */
  animateCaret?: boolean;
  label?: string;
}

/** The ~/tools wordmark as outlines with a mint block caret (spec §4.3). */
export function Logo({
  variant = 'full',
  animateCaret = true,
  label = 'tools home',
}: LogoProps) {
  const vbWidth = CARET.x + CARET.width;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vbWidth} ${LOGO_HEIGHT}`}
      className="tools-logo"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path d={LOGO_GLYPHS} fill="currentColor" />
      <rect
        x={CARET.x}
        y={CARET.y}
        width={CARET.width}
        height={CARET.height}
        rx={1}
        className="tools-logo-caret"
        data-variant={variant}
        data-blink={animateCaret || undefined}
      />
    </svg>
  );
}
Logo.displayName = 'Logo';

export { LogoMark } from './LogoMark';
