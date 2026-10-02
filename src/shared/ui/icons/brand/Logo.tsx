import { cn } from '@/shared/lib/cn';
import { ICON_PX, type IconSize } from '../icon';
import { CARET, LOGO_GLYPHS, LOGO_HEIGHT } from './logo-paths';

interface LogoProps {
  /** 'full': mint caret. 'mono': caret in the text colour (print). */
  variant?: 'full' | 'mono';
  /** Blink the caret three times (only when motion is allowed). */
  animateCaret?: boolean;
  label?: string;
  className?: string;
}

/** The ~/tools wordmark as outlines with a mint block caret (spec §4.3). */
export function Logo({
  variant = 'full',
  animateCaret = true,
  label = 'tools home',
  className,
}: LogoProps) {
  const vbWidth = CARET.x + CARET.width;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vbWidth} ${LOGO_HEIGHT}`}
      className={cn('h-5 w-auto', className)}
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
        className={cn(
          variant === 'mono' ? 'fill-current' : 'fill-accent',
          animateCaret && 'motion-safe:animate-caret-3',
        )}
      />
    </svg>
  );
}
Logo.displayName = 'Logo';

interface LogoMarkProps {
  size?: IconSize;
  label?: string;
  className?: string;
}

/** Caret tile for favicon, app icon and OG image. */
export function LogoMark({ size = 'xl', label, className }: LogoMarkProps) {
  const px = ICON_PX[size];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={cn('shrink-0', className)}
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true, focusable: false })}
    >
      {label ? <title>{label}</title> : null}
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        className="fill-logo-tile"
      />
      <rect x="13" y="6" width="5" height="12" rx="1" className="fill-accent" />
      <path
        d="M6 9l3 3-3 3"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-logo-glyph"
      />
    </svg>
  );
}
LogoMark.displayName = 'LogoMark';
