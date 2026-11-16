import type { ReactNode } from 'react';
import { ToolError } from '@/shared/lib/errors';

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A filled vector drawing (an ink signature) scaled to fit its box, aspect
 * kept and centred. The colour is validated, never passed through raw.
 */
export function InkSample({
  d,
  width,
  height,
  color,
  evenOdd,
  label,
}: {
  d: string;
  width: number;
  height: number;
  color: string;
  evenOdd?: boolean;
  /** Accessible name; leave out when the text beside it says it. */
  label?: string;
}) {
  if (!HEX.test(color))
    throw new ToolError(
      'INVALID_INPUT',
      `Ink must be #rrggbb, got "${color}".`,
    );
  if (!(width > 0 && height > 0 && Number.isFinite(width * height)))
    throw new ToolError('INVALID_INPUT', 'The drawing has no size.');
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <path d={d} fill={color} fillRule={evenOdd ? 'evenodd' : 'nonzero'} />
    </svg>
  );
}

/**
 * White paper of a fixed height for a signature preview: ink is shown on
 * paper in both themes, as it will be on the page.
 */
export function SamplePaper({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height,
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        color: '#111',
        border: '1px solid var(--cy-color-line)',
        borderRadius: 'var(--cy-radius-md)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

const FAMILY = /^[\w -]+$/;

/**
 * A name written in a signature font and ink (a typed signature), slanted,
 * on its own line. Inputs are validated, never passed through raw.
 */
export function TypedSample({
  family,
  text,
  slant = 0,
  color,
  size = 28,
  label,
}: {
  family: string;
  text: string;
  slant?: number;
  color: string;
  /** CSS px. */
  size?: number;
  label?: string;
}) {
  if (!HEX.test(color))
    throw new ToolError(
      'INVALID_INPUT',
      `Ink must be #rrggbb, got "${color}".`,
    );
  if (!FAMILY.test(family))
    throw new ToolError('INVALID_INPUT', `Invalid font family "${family}".`);
  const deg = Number.isFinite(slant) ? slant : 0;
  const shown = text.trim();
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      <span
        aria-hidden={label ? true : undefined}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          fontFamily: `"${family}"`,
          color,
          fontSize: size,
          transform: deg ? `skewX(${-deg}deg)` : undefined,
        }}
      >
        {shown || 'Your name'}
      </span>
    </span>
  );
}
