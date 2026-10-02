import type React from 'react';
import { cn } from '@/shared/lib/cn';
import { ToolError } from '@/shared/lib/errors';
import { colourPaint } from './swatch-paint';

/** Token colours a Swatch can show by name. */
const TOKENS = {
  accent: 'bg-accent',
  'accent-fg': 'bg-accent-fg',
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  redact: 'bg-redact',
  fg: 'bg-fg',
  'fg-muted': 'bg-fg-muted',
  'fg-subtle': 'bg-fg-subtle',
  surface: 'bg-surface',
  canvas: 'bg-canvas',
} as const;
export type SwatchToken = keyof typeof TOKENS;

const SIZE = {
  chip: { sm: 'size-4', md: 'size-6', lg: 'size-8' },
  dot: { sm: 'size-2.5', md: 'size-3', lg: 'size-4' },
  block: { sm: 'h-6 w-full', md: 'h-10 w-full', lg: 'h-16 w-full' },
} as const;

export interface SwatchProps {
  /**
   * A token name, or a CSS colour (hex or a colour function such as rgb(),
   * hsl() or oklch(), validated with `parseColor`). Bare words must be
   * token names, so a typo in a token never silently becomes a CSS name.
   */
  color: SwatchToken | (string & {});
  label: string;
  size?: 'sm' | 'md' | 'lg';
  /** chip: square; block: full-width bar; dot: small circle. */
  variant?: 'chip' | 'block' | 'dot';
  selected?: boolean;
  /**
   * Marks the swatch with a danger dot (for example failing contrast). The
   * text is added to the accessible name, so the flag is not colour-only.
   */
  flag?: string;
  className?: string;
}

const isCssText = (c: string) => c.startsWith('#') || c.includes('(');

/** Colour chip. The only kit home of a user-chosen colour as inline style. */
export function Swatch({
  color,
  label,
  size = 'md',
  variant = 'chip',
  selected,
  flag,
  className,
}: SwatchProps) {
  const token = (TOKENS as Record<string, string>)[color];
  let style: React.CSSProperties | undefined;
  if (!token) {
    const t = color.trim();
    if (!isCssText(t) && t.toLowerCase() !== 'transparent')
      throw new ToolError(
        'INVALID_INPUT',
        `Swatch colour must be a token name or a CSS colour, got "${color}".`,
      );
    try {
      style = colourPaint(t);
    } catch (e) {
      throw new ToolError(
        'INVALID_INPUT',
        `Swatch colour "${color}" is invalid: ${(e as Error).message}`,
        { cause: e },
      );
    }
  }
  return (
    <span
      role="img"
      aria-label={flag ? `${label}, ${flag}` : label}
      className={cn(
        'relative inline-block shrink-0 border border-line-control',
        variant === 'dot'
          ? 'rounded-full'
          : variant === 'block'
            ? 'block rounded-md'
            : 'rounded-sm',
        SIZE[variant][size],
        selected && 'outline-2 outline-offset-2 outline-focus',
        token,
        className,
      )}
      style={style}
    >
      {flag && (
        <span
          aria-hidden
          data-flag=""
          className="absolute -right-1 -top-1 size-2.5 rounded-full border border-surface bg-danger"
        />
      )}
    </span>
  );
}
Swatch.displayName = 'Swatch';
